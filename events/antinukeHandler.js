const AntiNuke = require("../models/AntiNuke");

// helper: is user exempt (owner/whitelist/roles)
function isExempt(guild, executor, record) {
  if (!executor || executor?.id === guild.ownerId) return true;
  if (record?.exemptUsers?.includes(executor.id)) return true;
  const member = guild.members.cache.get(executor.id) || null;
  if (!member) return true; // be conservative
  if (record?.exemptRoles?.some(r => member.roles.cache.has(r))) return true;
  // also skip bots (you could change)
  if (member.user.bot) return true;
  return false;
}

module.exports = (client) => {
  // list of watchers: event name -> audit log type & entry type we will check
  // We'll attach to events and then check audit logs for relevant actions.
  const watchers = [
    { evt: "guildBanAdd", auditType: "MEMBER_BAN_ADD", description: "Member banned" },
    { evt: "guildMemberRemove", auditType: "MEMBER_KICK", description: "Member removed (kick?)" },
    { evt: "channelDelete", auditType: "CHANNEL_DELETE", description: "Channel deleted" },
    { evt: "channelCreate", auditType: "CHANNEL_CREATE", description: "Channel created" },
    { evt: "roleDelete", auditType: "ROLE_DELETE", description: "Role deleted" },
    { evt: "roleCreate", auditType: "ROLE_CREATE", description: "Role created" },
    { evt: "webhookUpdate", auditType: "WEBHOOK_CREATE", description: "Webhook updated/created" },
    { evt: "guildUpdate", auditType: "GUILD_UPDATE", description: "Guild changed" },
  ];

  // helper to handle a detected event (pass guild, eventName, extra info)
  async function handle(guild, auditActionName, rawInfo = {}) {
    try {
      if (!guild) return;
      const record = await AntiNuke.findOne({ guildId: guild.id });
      if (!record || !record.enabled) return;

      // fetch audit logs - we use the action type if available, otherwise fetch recent
      const logs = await guild.fetchAuditLogs({ limit: 6, type: auditActionName }).catch(()=>null);
      const entry = logs?.entries?.first?.() || logs?.entries?.first();
      if (!entry) return;

      const executor = entry.executor;
      if (!executor) return;

      if (isExempt(guild, executor, record)) {
        // optionally notify server owner / log channel — keep minimal for now
        return;
      }

      // enforcement action
      if (record.action === "ban") {
        // try to ban executor
        const member = await guild.members.fetch(executor.id).catch(()=>null);
        if (member && guild.members.me.permissions.has("BanMembers")) {
          await member.ban({ reason: "Anti-Nuke protection triggered" }).catch(()=>{});
        } else {
          // fallback: remove dangerous perms/roles
          await stripDangerousRoles(guild, executor.id).catch(()=>{});
        }
      } else {
        // demote: remove dangerous permissions or remove managed roles
        await stripDangerousRoles(guild, executor.id).catch(()=>{});
      }

      // optional: send log to guild owner via DM (soft notify)
      try {
        const owner = await client.users.fetch(guild.ownerId).catch(()=>null);
        if (owner) {
          owner.send(`AntiNuke: action taken in server **${guild.name}** against **${executor.tag || executor.id}** for ${rawInfo.reason || "suspicious activity"}`).catch(()=>{});
        }
      } catch (err) {}

    } catch (err) {
      console.error("AntiNuke handler error:", err);
    }
  }

  // helper to remove roles that grant dangerous permissions
  async function stripDangerousRoles(guild, userId) {
    try {
      const member = await guild.members.fetch(userId).catch(()=>null);
      if (!member) return;
      // find roles with admin, manageGuild, manageRoles, manageChannels, banMembers, kickMembers, manageWebhooks
      const dangerous = member.roles.cache.filter(role => {
        if (!role.editable) return false; // skip roles we can't change
        const perms = role.permissions;
        const check = ["Administrator","ManageGuild","ManageRoles","ManageChannels","BanMembers","KickMembers","ManageWebhooks"];
        return check.some(p => perms.has(p));
      });
      for (const r of dangerous.values()) {
        try { await member.roles.remove(r).catch(()=>{}); } catch {}
      }
    } catch (e) { console.error("stripDangerousRoles err", e); }
  }

  // Attach listeners
  client.on("guildBanAdd", async (user) => {
    const guild = user.guild ?? null;
    await handle(guild, "MEMBER_BAN_ADD", { reason: "ban added" });
  });

  client.on("guildMemberRemove", async (member) => {
    const guild = member.guild;
    // mass kick detector: check recent audit logs for kicks
    await handle(guild, "MEMBER_KICK", { reason: "member removed" });
  });

  client.on("channelDelete", async (channel) => {
    await handle(channel.guild, "CHANNEL_DELETE", { reason: "channel deleted" });
  });

  client.on("channelCreate", async (channel) => {
    await handle(channel.guild, "CHANNEL_CREATE", { reason: "channel created" });
  });

  client.on("roleDelete", async (role) => {
    await handle(role.guild, "ROLE_DELETE", { reason: "role deleted" });
  });

  client.on("roleCreate", async (role) => {
    await handle(role.guild, "ROLE_CREATE", { reason: "role created" });
  });

  client.on("webhookUpdate", async (channel) => {
    await handle(channel.guild, "WEBHOOK_CREATE", { reason: "webhook update" });
  });

  client.on("guildUpdate", async (oldGuild, newGuild) => {
    // this may include vanity changes — quickly check audit logs
    await handle(newGuild, "GUILD_UPDATE", { reason: "guild updated" });
  });

  // keep a small alive log (optional)
  console.log("✅ AntiNuke handler loaded");
};
