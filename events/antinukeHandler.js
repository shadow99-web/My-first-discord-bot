const AntiNuke = require("../models/AntiNuke");
const { AuditLogEvent, PermissionFlagsBits } = require("discord.js");

async function punish(client, guild, executor, record, reason) {
  if (!executor || executor.id === guild.ownerId) return; // skip owner

  try {
    const member = await guild.members.fetch(executor.id).catch(() => null);
    if (!member) return;

    // Skip if whitelisted
    if (record.exemptUsers?.includes(member.id)) return;
    if (member.roles.cache.some(r => record.exemptRoles?.includes(r.id))) return;

    if (record.action === "ban" && guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)) {
      await member.ban({ reason: `Anti-Nuke: ${reason}` }).catch(() => {});
    } else {
      // Remove dangerous perms instead of banning
      const dangerous = member.roles.cache.filter(r => {
        const perms = r.permissions;
        return (
          perms.has(PermissionFlagsBits.Administrator) ||
          perms.has(PermissionFlagsBits.ManageGuild) ||
          perms.has(PermissionFlagsBits.ManageRoles) ||
          perms.has(PermissionFlagsBits.ManageChannels) ||
          perms.has(PermissionFlagsBits.BanMembers) ||
          perms.has(PermissionFlagsBits.KickMembers)
        );
      });

      for (const r of dangerous.values()) {
        if (r.editable) await member.roles.remove(r).catch(() => {});
      }
    }

    // DM the owner
    const owner = await client.users.fetch(guild.ownerId).catch(() => null);
    if (owner) {
      owner.send({
        content: `🚨 **Anti-Nuke Triggered!**\n` +
          `> Executor: **${executor.tag}**\n` +
          `> Guild: **${guild.name}**\n` +
          `> Action: **${reason}**\n` +
          `> Response: **${record.action.toUpperCase()}**`
      }).catch(() => {});
    }

  } catch (e) {
    console.error("AntiNuke punishment error:", e);
  }
}

async function checkAndHandle(client, guild, type, reason) {
  const record = await AntiNuke.findOne({ guildId: guild.id });
  if (!record?.enabled) return;

  // Wait for audit log entry to be available
  await new Promise(r => setTimeout(r, 1200));

  const logs = await guild.fetchAuditLogs({ type, limit: 1 }).catch(() => null);
  const entry = logs?.entries?.first();
  if (!entry) return;

  const executor = entry.executor;
  if (!executor || executor.bot || executor.id === guild.ownerId) return;

  // Block if not owner
  await punish(client, guild, executor, record, reason);
}

module.exports = (client) => {
  console.log("✅ Anti-Nuke Handler Active (Owner-only mode)");

  // Channel & Role Protection
  client.on("channelCreate", c => checkAndHandle(client, c.guild, AuditLogEvent.ChannelCreate, "Channel Created"));
  client.on("channelDelete", c => checkAndHandle(client, c.guild, AuditLogEvent.ChannelDelete, "Channel Deleted"));
  client.on("roleCreate", r => checkAndHandle(client, r.guild, AuditLogEvent.RoleCreate, "Role Created"));
  client.on("roleDelete", r => checkAndHandle(client, r.guild, AuditLogEvent.RoleDelete, "Role Deleted"));

  // Member Protection
  client.on("guildBanAdd", b => checkAndHandle(client, b.guild, AuditLogEvent.MemberBanAdd, "Member Banned"));
  client.on("guildMemberRemove", m => checkAndHandle(client, m.guild, AuditLogEvent.MemberKick, "Member Kicked"));

  // Webhook & Vanity URL Protection
  client.on("webhookUpdate", c => checkAndHandle(client, c.guild, AuditLogEvent.WebhookCreate, "Webhook Updated"));
  client.on("guildUpdate", (oldGuild, newGuild) =>
    checkAndHandle(client, newGuild, AuditLogEvent.GuildUpdate, "Guild Updated (possibly vanity or icon changed)")
  );
};
