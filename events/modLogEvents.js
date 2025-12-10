// events/modLogEvents.js
// Advanced mod log system — plug into safeRequireEvent("./events/modLogEvents.js", client);

const { EmbedBuilder, AuditLogEvent, PermissionFlagsBits } = require("discord.js");
const ModLog = require("../models/ModLog"); // your existing modlog schema

// Simple in-memory nickname cache (last N nicknames per guild->user). Small, not persistent.
const nicknameCache = new Map(); // key: `${guildId}:${userId}` -> array of { nick, at }

const MAX_NICK_CACHE = 50; // keep small

// Helper: safe send (avoids thrown rejections)
async function safeSend(channel, payload) {
  try {
    if (!channel || !channel.send) return;
    await channel.send(payload).catch(() => {});
  } catch (e) {
    // swallow
  }
}

// Helper: get config from DB (ModLog doc expected shape described below)
async function getConfig(guildId) {
  try {
    const cfg = await ModLog.findOne({ guildId });
    // If none, return defaults (disabled)
    return cfg || null;
  } catch (err) {
    console.error("modlog:getConfig error:", err);
    return null;
  }
}

// Helper: check if module enabled
function isModuleEnabled(cfg, name) {
  if (!cfg) return false;
  if (!Array.isArray(cfg.enabledModules)) return true; // if older docs, assume enabled
  return cfg.enabledModules.includes(name);
}

// Quick embed builder
function makeEmbed(title, color, opts = {}) {
  const e = new EmbedBuilder()
    .setTitle(title)
    .setColor(color || "DarkButNotBlack")
    .setTimestamp();

  if (opts.thumbnail) e.setThumbnail(opts.thumbnail);
  if (opts.footer) e.setFooter(opts.footer);
  return e;
}

// Attempt to fetch audit log executor safely
async function fetchAuditExecutor(guild, type, targetId, withinMs = 10_000) {
  try {
    if (!guild || !guild.members?.me) return null;
    if (!guild.members.me.permissions.has(PermissionFlagsBits.ViewAuditLog)) return null;

    // choose audit event type
    const eventsMap = {
      MESSAGE_DELETE: AuditLogEvent.MessageDelete,
      MESSAGE_BULK_DELETE: AuditLogEvent.MessageBulkDelete,
      MESSAGE_UPDATE: AuditLogEvent.MessageUpdate,
      MEMBER_KICK: AuditLogEvent.MemberKick,
      MEMBER_BAN_ADD: AuditLogEvent.MemberBanAdd,
      MEMBER_BAN_REMOVE: AuditLogEvent.MemberBanRemove,
      MEMBER_UPDATE: AuditLogEvent.MemberUpdate,
      ROLE_CREATE: AuditLogEvent.RoleCreate,
      ROLE_DELETE: AuditLogEvent.RoleDelete,
      CHANNEL_CREATE: AuditLogEvent.ChannelCreate,
      CHANNEL_DELETE: AuditLogEvent.ChannelDelete,
      WEBHOOK_CREATE: AuditLogEvent.WebhookCreate,
    };

    const evt = eventsMap[type];
    if (!evt) return null;

    const logs = await guild.fetchAuditLogs({ type: evt, limit: 6 }).catch(() => null);
    if (!logs) return null;

    // Try to find an entry that touches given targetId and is recent
    const entries = logs.entries.filter(([, entry]) => {
      try {
        if (!entry) return false;
        // time check
        const age = Date.now() - (entry.createdTimestamp || Date.now());
        if (Math.abs(age) > withinMs) return false;
        // target check: some events use entry.target.id
        if (entry.target && entry.target.id && targetId && entry.target.id === targetId) return true;
        // for message delete we can't match target; instead use executor recency
        return true;
      } catch {
        return false;
      }
    });

    if (!entries.length) return null;
    // return most recent entry's executor
    const [ , entry ] = entries[0];
    return entry?.executor || null;
  } catch (err) {
    return null;
  }
}

// Utility: format attachment list into markdown
function formatAttachments(attachments) {
  if (!attachments || !attachments.size) return "*none*";
  return attachments.map(a => `[${a.name || "file"}](${a.url})`).join("\n");
}

// Deep difference for objects (used for role/channel/guild diffs)
function diffObject(oldObj = {}, newObj = {}, keysToIgnore = []) {
  const diffs = [];
  const keys = new Set([...Object.keys(oldObj || {}), ...Object.keys(newObj || {})]);
  keys.forEach((k) => {
    if (keysToIgnore.includes(k)) return;
    const oldVal = oldObj[k];
    const newVal = newObj[k];
    if (String(oldVal) !== String(newVal)) {
      diffs.push({ key: k, before: oldVal === undefined ? "*none*" : String(oldVal), after: newVal === undefined ? "*none*" : String(newVal) });
    }
  });
  return diffs;
}

// Human readable permission changes for roles
function rolePermissionsDiff(oldPerms = 0n, newPerms = 0n) {
  try {
    const changed = [];
    const permFlags = Object.entries(PermissionFlagsBits);
    permFlags.forEach(([name, bit]) => {
      const oldHas = Boolean(BigInt(oldPerms) & BigInt(bit));
      const newHas = Boolean(BigInt(newPerms) & BigInt(bit));
      if (oldHas !== newHas) changed.push({ perm: name, from: oldHas, to: newHas });
    });
    return changed;
  } catch {
    return [];
  }
}

// Keep nickname cache updated
function pushNicknameCache(guildId, userId, nick) {
  const key = `${guildId}:${userId}`;
  const arr = nicknameCache.get(key) || [];
  arr.push({ nick: nick || null, at: Date.now() });
  if (arr.length > MAX_NICK_CACHE) arr.splice(0, arr.length - MAX_NICK_CACHE);
  nicknameCache.set(key, arr);
}

// Main export
module.exports = (client) => {
  // console
  console.log("✅ Advanced ModLog loaded.");

  // helper to send to configured channel if module enabled
  async function sendLogSafe(guildId, moduleName, embed) {
    try {
      const cfg = await getConfig(guildId);
      if (!cfg) return;
      if (!isModuleEnabled(cfg, moduleName)) return;
      const channel = client.channels.cache.get(cfg.channelId);
      if (!channel) return;
      await safeSend(channel, { embeds: [embed] });
    } catch (err) {
      console.error("modlog:sendLogSafe error:", err);
    }
  }

  // ----------------------------
  // Message Delete
  // ----------------------------
  client.on("messageDelete", async (msg) => {
    try {
      if (!msg.guild) return;
      if (msg.author?.bot) return;

      const cfg = await getConfig(msg.guild.id);
      if (!cfg || !isModuleEnabled(cfg, "messageDelete")) return;

      // Attempt to find who deleted via audit logs (best-effort)
      const actor = await fetchAuditExecutor(msg.guild, "MESSAGE_DELETE", msg.author?.id, 10_000);

      const embed = makeEmbed("🗑️ MESSAGE DELETED", "Red", msg.author?.displayAvatarURL?.())
        .setDescription(`**User:** ${msg.author?.tag || "Unknown"} (${msg.author?.id || "?"})\n**Channel:** ${msg.channel?.toString() || "Unknown"}`)
        .addFields(
          { name: "Content", value: msg.content ? (msg.content.slice(0, 1024) || "*empty*") : "*embed/attachment/unknown*" },
          { name: "Attachments", value: formatAttachments(msg.attachments) }
        )
        .setFooter({ text: actor ? `Deleted by ${actor.tag} (${actor.id})` : `Author ID: ${msg.author?.id || "?"}` });

      await sendLogSafe(msg.guild.id, "messageDelete", embed);
    } catch (err) {
      console.error("modlog:messageDelete error:", err);
    }
  });

  // ----------------------------
  // Message Bulk Delete
  // ----------------------------
  client.on("messageDeleteBulk", async (messages) => {
    try {
      if (!messages || messages.size === 0) return;
      const guild = messages.first()?.guild;
      if (!guild) return;

      const cfg = await getConfig(guild.id);
      if (!cfg || !isModuleEnabled(cfg, "messageBulkDelete")) return;

      const embed = makeEmbed("🗑️ BULK MESSAGE DELETE", "DarkRed")
        .setDescription(`**Channel:** ${messages.first().channel?.toString() || "Unknown"}\n**Count:** ${messages.size}`)
        .addFields(
          { name: "Preview", value: messages.map(m => `${m.author ? `${m.author.tag}` : "Unknown"}: ${m.content?.slice(0, 200) || "[embed/att]"}`).slice(0, 6).join("\n") || "*none*" }
        );

      // try audit logs
      const actor = await fetchAuditExecutor(guild, "MESSAGE_BULK_DELETE", null, 20_000);
      if (actor) embed.setFooter({ text: `Bulk delete by ${actor.tag} (${actor.id})` });

      await sendLogSafe(guild.id, "messageBulkDelete", embed);
    } catch (err) {
      console.error("modlog:messageDeleteBulk error:", err);
    }
  });

  // ----------------------------
  // Message Update (edit)
  // ----------------------------
  client.on("messageUpdate", async (oldMsg, newMsg) => {
    try {
      if (!newMsg.guild) return;
      if (newMsg.author?.bot) return;
      // if no real content change
      if ((oldMsg?.content || "") === (newMsg?.content || "")) return;

      const cfg = await getConfig(newMsg.guild.id);
      if (!cfg || !isModuleEnabled(cfg, "messageEdit")) return;

      // attempt actor (edits are usually by author; audit log not helpful)
      const embed = makeEmbed("✏️ MESSAGE EDITED", "Yellow", newMsg.author?.displayAvatarURL?.())
        .setDescription(`**User:** ${newMsg.author?.tag || "Unknown"}\n**Channel:** ${newMsg.channel?.toString() || "Unknown"}`)
        .addFields(
          { name: "Before", value: (oldMsg?.content?.slice(0, 1024) || "*unknown*") },
          { name: "After", value: (newMsg?.content?.slice(0, 1024) || "*unknown*") }
        )
        .setFooter({ text: `User ID: ${newMsg.author?.id || "?"}` });

      await sendLogSafe(newMsg.guild.id, "messageEdit", embed);
    } catch (err) {
      console.error("modlog:messageUpdate error:", err);
    }
  });

  // ----------------------------
  // Member join / leave
  // ----------------------------
  client.on("guildMemberAdd", async (m) => {
    try {
      const cfg = await getConfig(m.guild.id);
      if (!cfg || !isModuleEnabled(cfg, "memberJoin")) return;

      const embed = makeEmbed("✅ MEMBER JOINED", "Green", m.user.displayAvatarURL?.())
        .setDescription(`**User:** ${m.user.tag}\n**Account Created:** <t:${Math.floor(m.user.createdTimestamp / 1000)}:R>`)
        .setFooter({ text: `User ID: ${m.id}` });

      await sendLogSafe(m.guild.id, "memberJoin", embed);
    } catch (err) {
      console.error("modlog:memberAdd error:", err);
    }
  });

  client.on("guildMemberRemove", async (m) => {
    try {
      const cfg = await getConfig(m.guild.id);
      if (!cfg || !isModuleEnabled(cfg, "memberLeave")) return;

      const embed = makeEmbed("💔 MEMBER LEFT", "Red", m.user.displayAvatarURL?.())
        .setDescription(`**User:** ${m.user.tag}\n**Account Created:** <t:${Math.floor(m.user.createdTimestamp / 1000)}:R>`)
        .setFooter({ text: `User ID: ${m.id}` });

      await sendLogSafe(m.guild.id, "memberLeave", embed);
    } catch (err) {
      console.error("modlog:memberRemove error:", err);
    }
  });

  // ----------------------------
  // Bans / Unbans
  // ----------------------------
  client.on("guildBanAdd", async (ban) => {
    try {
      const cfg = await getConfig(ban.guild.id);
      if (!cfg || !isModuleEnabled(cfg, "banAdd")) return;

      const actor = await fetchAuditExecutor(ban.guild, "MEMBER_BAN_ADD", ban.user?.id, 10_000);

      const embed = makeEmbed("🔨 MEMBER BANNED", "DarkRed", ban.user?.displayAvatarURL?.())
        .setDescription(`**User:** ${ban.user?.tag || "Unknown"}\n**Reason:** ${ban.reason || "Unknown"}`)
        .setFooter({ text: actor ? `Banned by ${actor.tag} (${actor.id})` : `User ID: ${ban.user?.id || "?"}` });

      await sendLogSafe(ban.guild.id, "banAdd", embed);
    } catch (err) {
      console.error("modlog:banAdd error:", err);
    }
  });

  client.on("guildBanRemove", async (ban) => {
    try {
      const cfg = await getConfig(ban.guild.id);
      if (!cfg || !isModuleEnabled(cfg, "banRemove")) return;

      const actor = await fetchAuditExecutor(ban.guild, "MEMBER_BAN_REMOVE", ban.user?.id, 10_000);

      const embed = makeEmbed("♻️ MEMBER UNBANNED", "DarkGreen", ban.user?.displayAvatarURL?.())
        .setDescription(`**User:** ${ban.user?.tag || "Unknown"}`)
        .setFooter({ text: actor ? `Unbanned by ${actor.tag} (${actor.id})` : `User ID: ${ban.user?.id || "?"}` });

      await sendLogSafe(ban.guild.id, "banRemove", embed);
    } catch (err) {
      console.error("modlog:banRemove error:", err);
    }
  });

  // ----------------------------
  // Role create/delete/update
  // ----------------------------
  client.on("roleCreate", async (role) => {
    try {
      const cfg = await getConfig(role.guild.id);
      if (!cfg || !isModuleEnabled(cfg, "roleCreate")) return;

      const actor = await fetchAuditExecutor(role.guild, "ROLE_CREATE", role.id, 10_000);

      const embed = makeEmbed("🎭 ROLE CREATED", "Green")
        .setDescription(`**Name:** ${role.name}\n**ID:** ${role.id}`)
        .setFooter({ text: actor ? `By ${actor.tag} (${actor.id})` : `No actor info` });

      await sendLogSafe(role.guild.id, "roleCreate", embed);
    } catch (err) {
      console.error("modlog:roleCreate error:", err);
    }
  });

  client.on("roleDelete", async (role) => {
    try {
      const cfg = await getConfig(role.guild.id);
      if (!cfg || !isModuleEnabled(cfg, "roleDelete")) return;

      const actor = await fetchAuditExecutor(role.guild, "ROLE_DELETE", role.id, 10_000);

      const embed = makeEmbed("❤‍🩹 ROLE DELETED", "Red")
        .setDescription(`**Name:** ${role.name}\n**ID:** ${role.id}`)
        .setFooter({ text: actor ? `By ${actor.tag} (${actor.id})` : `No actor info` });

      await sendLogSafe(role.guild.id, "roleDelete", embed);
    } catch (err) {
      console.error("modlog:roleDelete error:", err);
    }
  });

  client.on("roleUpdate", async (oldRole, newRole) => {
    try {
      if (!oldRole.guild) return;
      const cfg = await getConfig(oldRole.guild.id);
      if (!cfg || !isModuleEnabled(cfg, "roleUpdate")) return;

      // compute diffs for interesting fields
      const diffs = [];
      if (oldRole.name !== newRole.name) diffs.push({ k: "Name", before: oldRole.name, after: newRole.name });
      if (String(oldRole.color) !== String(newRole.color)) diffs.push({ k: "Color", before: oldRole.color, after: newRole.color });
      if (oldRole.hoist !== newRole.hoist) diffs.push({ k: "Hoist", before: oldRole.hoist, after: newRole.hoist });
      if (oldRole.mentionable !== newRole.mentionable) diffs.push({ k: "Mentionable", before: oldRole.mentionable, after: newRole.mentionable });

      // permissions diff
      const permDiff = rolePermissionsDiff(oldRole.permissions.bitfield, newRole.permissions.bitfield);
      if (permDiff.length) diffs.push({ k: "Permissions", before: "See below", after: "See below", permDiff });

      if (!diffs.length) return;

      const actor = await fetchAuditExecutor(oldRole.guild, "ROLE_UPDATE", newRole.id, 10_000);

      const embed = makeEmbed("📝 ROLE UPDATED", "Orange", newRole?.iconURL?.())
        .setDescription(`**Role:** ${newRole.name} (${newRole.id})`)
        .setFooter({ text: actor ? `Changed by ${actor.tag} (${actor.id})` : `Role ID: ${newRole.id}` });

      diffs.forEach(d => {
        if (d.k === "Permissions" && d.permDiff) {
          const permsText = d.permDiff.map(p => `${p.to ? "✅" : "❌"} ${p.perm}`).slice(0, 10).join("\n");
          embed.addFields({ name: "Permissions Changes", value: permsText || "*many changes*", inline: false });
        } else {
          embed.addFields({ name: d.k, value: `Before: ${String(d.before)}\nAfter: ${String(d.after)}`, inline: false });
        }
      });

      await sendLogSafe(oldRole.guild.id, "roleUpdate", embed);
    } catch (err) {
      console.error("modlog:roleUpdate error:", err);
    }
  });

  // ----------------------------
  // Channel events (create/delete/update)
  // ----------------------------
  client.on("channelCreate", async (ch) => {
    try {
      if (!ch.guild) return;
      const cfg = await getConfig(ch.guild.id);
      if (!cfg || !isModuleEnabled(cfg, "channelCreate")) return;

      const actor = await fetchAuditExecutor(ch.guild, "CHANNEL_CREATE", ch.id, 10_000);

      const embed = makeEmbed("📺 CHANNEL CREATED", "Green")
        .setDescription(`**Name:** ${ch.name}\n**ID:** ${ch.id}\n**Type:** ${ch.type}`)
        .setFooter({ text: actor ? `By ${actor.tag} (${actor.id})` : `No actor` });

      await sendLogSafe(ch.guild.id, "channelCreate", embed);
    } catch (err) {
      console.error("modlog:channelCreate error:", err);
    }
  });

  client.on("channelDelete", async (ch) => {
    try {
      if (!ch.guild) return;
      const cfg = await getConfig(ch.guild.id);
      if (!cfg || !isModuleEnabled(cfg, "channelDelete")) return;

      const actor = await fetchAuditExecutor(ch.guild, "CHANNEL_DELETE", ch.id, 10_000);

      const embed = makeEmbed("📛 CHANNEL DELETED", "Red")
        .setDescription(`**Name:** ${ch.name}\n**Type:** ${ch.type}`)
        .setFooter({ text: actor ? `By ${actor.tag} (${actor.id})` : `Channel ID: ${ch.id}` });

      await sendLogSafe(ch.guild.id, "channelDelete", embed);
    } catch (err) {
      console.error("modlog:channelDelete error:", err);
    }
  });

  client.on("channelUpdate", async (oldCh, newCh) => {
    try {
      if (!oldCh.guild) return;
      const cfg = await getConfig(oldCh.guild.id);
      if (!cfg || !isModuleEnabled(cfg, "channelUpdate")) return;

      const diffs = diffObject(
        { name: oldCh.name, topic: oldCh.topic, nsfw: oldCh.nsfw, rateLimitPerUser: oldCh.rateLimitPerUser },
        { name: newCh.name, topic: newCh.topic, nsfw: newCh.nsfw, rateLimitPerUser: newCh.rateLimitPerUser },
        []
      );
      if (!diffs.length) return;

      const actor = await fetchAuditExecutor(oldCh.guild, "CHANNEL_UPDATE", newCh.id, 10_000);

      const embed = makeEmbed("🔄 CHANNEL UPDATED", "Orange")
        .setDescription(`**Channel:** ${newCh.toString()}`)
        .setFooter({ text: actor ? `Changed by ${actor.tag} (${actor.id})` : `Channel ID: ${newCh.id}` });

      diffs.forEach(d => {
        embed.addFields({ name: d.key || d.k, value: `Before: ${d.before}\nAfter: ${d.after}` });
      });

      await sendLogSafe(oldCh.guild.id, "channelUpdate", embed);
    } catch (err) {
      console.error("modlog:channelUpdate error:", err);
    }
  });

  // ----------------------------
  // Nickname change tracker
  // ----------------------------
  client.on("guildMemberUpdate", async (oldMem, newMem) => {
    try {
      if (!oldMem.guild) return;
      const cfg = await getConfig(oldMem.guild.id);
      if (!cfg) return;

      // nickname change
      if (oldMem.nickname !== newMem.nickname && isModuleEnabled(cfg, "nicknameChange")) {
        pushNicknameCache(oldMem.guild.id, newMem.id, newMem.nickname);

        const actor = await fetchAuditExecutor(oldMem.guild, "MEMBER_UPDATE", newMem.id, 10_000);

        const embed = makeEmbed("🟢 NICKNAME CHANGED", "Purple", newMem.user.displayAvatarURL?.())
          .addFields(
            { name: "User", value: `${newMem.user.tag}` },
            { name: "Before", value: oldMem.nickname || "None", inline: true },
            { name: "After", value: newMem.nickname || "None", inline: true },
          )
          .setFooter({ text: actor ? `Changed by ${actor.tag} (${actor.id})` : `User ID: ${newMem.id}` });

        await sendLogSafe(oldMem.guild.id, "nicknameChange", embed);
      }
    } catch (err) {
      console.error("modlog:gMemberUpdate error:", err);
    }
  });

  // ----------------------------
  // Guild update (icon/name/boost) — succinct diff
  // ----------------------------
  client.on("guildUpdate", async (oldGuild, newGuild) => {
    try {
      const cfg = await getConfig(newGuild.id);
      if (!cfg || !isModuleEnabled(cfg, "guildUpdate")) return;

      const diffs = [];
      if (oldGuild.name !== newGuild.name) diffs.push({ k: "Name", before: oldGuild.name, after: newGuild.name });
      if (oldGuild.icon !== newGuild.icon) diffs.push({ k: "Icon", before: oldGuild.icon ? "Exists" : "None", after: newGuild.icon ? "Exists" : "None" });
      if (oldGuild.vanityURLCode !== newGuild.vanityURLCode) diffs.push({ k: "Vanity URL", before: oldGuild.vanityURLCode || "None", after: newGuild.vanityURLCode || "None" });
      if (!diffs.length) return;

      const embed = makeEmbed("🌐 SERVER UPDATED", "Blue", newGuild.iconURL?.())
        .setDescription(`**Server:** ${newGuild.name}`);

      diffs.forEach(d => embed.addFields({ name: d.k, value: `Before: ${d.before}\nAfter: ${d.after}` }));

      await sendLogSafe(newGuild.id, "guildUpdate", embed);
    } catch (err) {
      console.error("modlog:guildUpdate error:", err);
    }
  });

  // Final safety: catch-all error handler on the client
  client.on("error", (err) => {
    console.error("modlog:client error:", err);
  });
};
