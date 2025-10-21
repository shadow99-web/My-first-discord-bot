const AntiNuke = require("../models/AntiNuke");
const { AuditLogEvent, PermissionFlagsBits, Collection } = require("discord.js");

// simple cooldown tracker (guildID+executorID -> recent events)
const recentActions = new Collection();

function isExempt(guild, executor, record) {
  if (!executor || executor.id === guild.ownerId) return true;
  if (record?.exemptUsers?.includes(executor.id)) return true;

  const member = guild.members.cache.get(executor.id);
  if (!member) return true;
  if (record?.exemptRoles?.some(r => member.roles.cache.has(r))) return true;
  if (member.user.bot) return true;

  return false;
}

async function stripDangerousRoles(guild, userId) {
  const member = await guild.members.fetch(userId).catch(() => null);
  if (!member) return;
  const dangerous = member.roles.cache.filter(role => {
    if (!role.editable) return false;
    const perms = role.permissions;
    return ["Administrator", "ManageGuild", "ManageRoles", "ManageChannels", "BanMembers", "KickMembers", "ManageWebhooks"]
      .some(p => perms.has(p));
  });
  for (const r of dangerous.values()) {
    await member.roles.remove(r).catch(() => {});
  }
}

module.exports = (client) => {
  console.log("✅ AntiNuke handler loaded");

  async function handle(guild, auditType, description) {
    if (!guild?.available) return;
    const record = await AntiNuke.findOne({ guildId: guild.id });
    if (!record?.enabled) return;

    await new Promise(r => setTimeout(r, 1500)); // wait for logs to register

    const logs = await guild.fetchAuditLogs({ type: auditType, limit: 1 }).catch(() => null);
    const entry = logs?.entries?.first();
    if (!entry) return;

    const executor = entry.executor;
    if (isExempt(guild, executor, record)) return;

    const key = `${guild.id}_${executor.id}`;
    const data = recentActions.get(key) || { count: 0, time: Date.now() };

    if (Date.now() - data.time < 10000) {
      data.count++;
    } else {
      data.count = 1;
      data.time = Date.now();
    }
    recentActions.set(key, data);

    // only act after 3 suspicious actions in 10s
    if (data.count < 3) return;

    console.log(`[ANTINUKE] ${executor.tag} triggered ${description} in ${guild.name}`);

    const member = await guild.members.fetch(executor.id).catch(() => null);
    if (!member) return;

    if (record.action === "ban" && guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)) {
      await member.ban({ reason: `Anti-Nuke: ${description}` }).catch(() => {});
    } else {
      await stripDangerousRoles(guild, executor.id);
    }

    const owner = await client.users.fetch(guild.ownerId).catch(() => null);
    owner?.send(`🚨 Anti-Nuke: **${executor.tag}** triggered ${description} in **${guild.name}** and was ${record.action}ed.`);
  }

  // --- event listeners ---
  client.on("channelDelete", c => handle(c.guild, AuditLogEvent.ChannelDelete, "Channel Delete"));
  client.on("channelCreate", c => handle(c.guild, AuditLogEvent.ChannelCreate, "Channel Create"));
  client.on("roleDelete", r => handle(r.guild, AuditLogEvent.RoleDelete, "Role Delete"));
  client.on("roleCreate", r => handle(r.guild, AuditLogEvent.RoleCreate, "Role Create"));
  client.on("guildBanAdd", g => handle(g.guild, AuditLogEvent.MemberBanAdd, "Member Ban"));
  client.on("guildMemberRemove", m => handle(m.guild, AuditLogEvent.MemberKick, "Kick/Remove"));
  client.on("webhookUpdate", c => handle(c.guild, AuditLogEvent.WebhookCreate, "Webhook Change"));
  client.on("guildUpdate", (o, n) => handle(n, AuditLogEvent.GuildUpdate, "Guild Update/Vanity Change"));
};
