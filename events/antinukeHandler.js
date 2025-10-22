// handlers/antinuke-enforce.js
const AntiNuke = require("../models/AntiNuke");
const { AuditLogEvent, PermissionFlagsBits } = require("discord.js");

// short helper: check exemption (owner, explicit exempt users/roles, bots)
function isExempt(guild, executor, record) {
  if (!executor) return true;
  if (executor.id === guild.ownerId) return true;
  if (record?.exemptUsers?.includes(executor.id)) return true;

  const member = guild.members.cache.get(executor.id) || null;
  if (!member) return true; // be conservative when member missing
  if (member.user.bot) return true;
  if (record?.exemptRoles?.some(rid => member.roles.cache.has(rid))) return true;
  return false;
}

// recreate a deleted channel as closely as possible (text/voice/category)
async function recreateChannel(guild, deletedChannel) {
  try {
    const options = {
      type: deletedChannel.type,
      topic: deletedChannel.topic ?? undefined,
      nsfw: deletedChannel.nsfw ?? undefined,
      position: deletedChannel.position ?? undefined,
      rateLimitPerUser: deletedChannel.rateLimitPerUser ?? undefined,
      parent: deletedChannel.parentId ?? undefined,
      permissionOverwrites: deletedChannel.permissionOverwrites.cache.map(po => ({
        id: po.id,
        allow: po.allow.bitfield,
        deny: po.deny.bitfield,
        type: po.type,
      })),
      reason: "AntiNuke: restoring deleted channel",
    };

    // For categories, only name & position are relevant; voice/text differ slightly.
    const created = await guild.channels.create({ name: deletedChannel.name, ...options });
    return created;
  } catch (err) {
    console.error("recreateChannel error:", err);
    return null;
  }
}

// recreate role deleted
async function recreateRole(guild, deletedRole) {
  try {
    const data = {
      name: deletedRole.name,
      color: deletedRole.color || undefined,
      hoist: deletedRole.hoist ?? false,
      mentionable: deletedRole.mentionable ?? false,
      permissions: deletedRole.permissions.bitfield || undefined,
      reason: "AntiNuke: restoring deleted role",
    };
    const role = await guild.roles.create({ ...data });
    return role;
  } catch (err) {
    console.error("recreateRole error:", err);
    return null;
  }
}

// strip dangerous roles from a member
async function stripDangerousRoles(guild, userId) {
  try {
    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member) return;
    const dangerous = member.roles.cache.filter(role => {
      if (!role.editable) return false;
      const perms = role.permissions;
      return (
        perms.has(PermissionFlagsBits.Administrator) ||
        perms.has(PermissionFlagsBits.ManageGuild) ||
        perms.has(PermissionFlagsBits.ManageRoles) ||
        perms.has(PermissionFlagsBits.ManageChannels) ||
        perms.has(PermissionFlagsBits.BanMembers) ||
        perms.has(PermissionFlagsBits.KickMembers) ||
        perms.has(PermissionFlagsBits.ManageWebhooks)
      );
    });
    for (const r of dangerous.values()) {
      await member.roles.remove(r).catch(() => {});
    }
  } catch (err) {
    console.error("stripDangerousRoles error:", err);
  }
}

module.exports = (client) => {
  console.log("✅ AntiNuke enforcement handler loaded");

  // small helper that fetches the relevant audit log entry for the given type
  async function getRecentAuditEntry(guild, auditType) {
    try {
      // fetch the latest entry of that type
      const logs = await guild.fetchAuditLogs({ limit: 5, type: auditType }).catch(() => null);
      if (!logs) return null;
      return logs.entries.first();
    } catch (err) {
      return null;
    }
  }

  async function handleChannelDelete(channel) {
    try {
      const guild = channel.guild;
      if (!guild || !guild.available) return;
      const record = await AntiNuke.findOne({ guildId: guild.id });
      if (!record?.enabled) return;

      // small delay to let audit logs populate
      await new Promise(r => setTimeout(r, 1500));
      const entry = await getRecentAuditEntry(guild, AuditLogEvent.ChannelDelete);
      const executor = entry?.executor;
      if (!executor) return;

      if (isExempt(guild, executor, record)) return;

      // recreate the channel
      const recreated = await recreateChannel(guild, channel);
      // enforce additional action
      if (record.action === "ban" && guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)) {
        const member = await guild.members.fetch(executor.id).catch(() => null);
        if (member) await member.ban({ reason: "AntiNuke: deleted a channel" }).catch(() => {});
      } else {
        await stripDangerousRoles(guild, executor.id);
      }

      // notify owner
      try {
        const owner = await client.users.fetch(guild.ownerId).catch(() => null);
        owner?.send(`AntiNuke: ${executor.tag} deleted channel "${channel.name}" in ${guild.name}. Channel restored.`).catch(()=>{});
      } catch {}
    } catch (err) {
      console.error("handleChannelDelete error:", err);
    }
  }

  async function handleChannelCreate(channel) {
    try {
      const guild = channel.guild;
      if (!guild || !guild.available) return;
      const record = await AntiNuke.findOne({ guildId: guild.id });
      if (!record?.enabled) return;

      // small delay to fetch logs
      await new Promise(r => setTimeout(r, 1200));
      const entry = await getRecentAuditEntry(guild, AuditLogEvent.ChannelCreate);
      const executor = entry?.executor;
      if (!executor) return;

      if (isExempt(guild, executor, record)) return;

      // delete the created channel (not allowed)
      await channel.delete("AntiNuke: channel creation not permitted").catch(() => {});

      // enforcement
      if (record.action === "ban" && guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)) {
        const member = await guild.members.fetch(executor.id).catch(() => null);
        if (member) await member.ban({ reason: "AntiNuke: created channels" }).catch(() => {});
      } else {
        await stripDangerousRoles(guild, executor.id);
      }

      // notify owner
      try {
        const owner = await client.users.fetch(guild.ownerId).catch(() => null);
        owner?.send(`AntiNuke: ${executor.tag} created channel "${channel.name}" in ${guild.name}. Channel removed.`).catch(()=>{});
      } catch {}
    } catch (err) {
      console.error("handleChannelCreate error:", err);
    }
  }

  async function handleRoleDelete(role) {
    try {
      const guild = role.guild;
      if (!guild || !guild.available) return;
      const record = await AntiNuke.findOne({ guildId: guild.id });
      if (!record?.enabled) return;

      await new Promise(r => setTimeout(r, 1500));
      const entry = await getRecentAuditEntry(guild, AuditLogEvent.RoleDelete);
      const executor = entry?.executor;
      if (!executor) return;

      if (isExempt(guild, executor, record)) return;

      // recreate role
      const recreated = await recreateRole(guild, role);

      // enforcement
      if (record.action === "ban" && guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)) {
        const member = await guild.members.fetch(executor.id).catch(() => null);
        if (member) await member.ban({ reason: "AntiNuke: deleted a role" }).catch(() => {});
      } else {
        await stripDangerousRoles(guild, executor.id);
      }

      try {
        const owner = await client.users.fetch(guild.ownerId).catch(() => null);
        owner?.send(`AntiNuke: ${executor.tag} deleted role "${role.name}" in ${guild.name}. Role restored.`).catch(()=>{});
      } catch {}
    } catch (err) {
      console.error("handleRoleDelete error:", err);
    }
  }

  async function handleRoleCreate(role) {
    try {
      const guild = role.guild;
      if (!guild || !guild.available) return;
      const record = await AntiNuke.findOne({ guildId: guild.id });
      if (!record?.enabled) return;

      await new Promise(r => setTimeout(r, 1200));
      const entry = await getRecentAuditEntry(guild, AuditLogEvent.RoleCreate);
      const executor = entry?.executor;
      if (!executor) return;

      if (isExempt(guild, executor, record)) return;

      // delete role
      await role.delete("AntiNuke: role creation not permitted").catch(() => {});

      // enforce
      if (record.action === "ban" && guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)) {
        const member = await guild.members.fetch(executor.id).catch(() => null);
        if (member) await member.ban({ reason: "AntiNuke: created roles" }).catch(() => {});
      } else {
        await stripDangerousRoles(guild, executor.id);
      }

      try {
        const owner = await client.users.fetch(guild.ownerId).catch(() => null);
        owner?.send(`AntiNuke: ${executor.tag} created role "${role.name}" in ${guild.name}. Role removed.`).catch(()=>{});
      } catch {}
    } catch (err) {
      console.error("handleRoleCreate error:", err);
    }
  }

  // Attach listeners
  client.on("channelDelete", handleChannelDelete);
  client.on("channelCreate", handleChannelCreate);
  client.on("roleDelete", handleRoleDelete);
  client.on("roleCreate", handleRoleCreate);

  // Optional: protect webhooks, server updates, etc. by adding listeners similarly.
};
