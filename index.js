/**
 * index.js
 * Full-featured Discord bot (slash + prefix) for Render
 *
 * Required environment variables (on Render):
 * - TOKEN (bot token)
 * - CLIENT_ID (application id)
 * - GUILD_ID (optional, for instant guild registration)
 * - LOG_CHANNEL_ID (optional, channel id to send moderation logs)
 * - PORT (optional)
 *
 * Also ensure prefixes.json exists ({}). The script will create it if missing.
 */

require('dotenv').config();
const fs = require('fs');
const express = require('express');
const {
  Client,
  GatewayIntentBits,
  Partials,
  REST,
  Routes,
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  EmbedBuilder
} = require('discord.js');

// --------------- Basic config ----------------
const DEFAULT_PREFIX = '!';
const PREFIXES_FILE = './prefixes.json';
const SNIPES_PER_CHANNEL = 100;

// --------------- Ensure files ----------------
if (!fs.existsSync(PREFIXES_FILE)) {
  try { fs.writeFileSync(PREFIXES_FILE, JSON.stringify({}, null, 2)); } catch (e) { console.error('Failed creating prefixes file', e); }
}
let prefixes = {};
try { prefixes = JSON.parse(fs.readFileSync(PREFIXES_FILE, 'utf8') || '{}'); } catch (e) { prefixes = {}; console.error('Failed to read prefixes.json', e); }
function savePrefixes() {
  try { fs.writeFileSync(PREFIXES_FILE, JSON.stringify(prefixes, null, 2)); } catch (e) { console.error('Failed saving prefixes.json', e); }
}

// --------------- Keep-alive (Render) ----------------
const app = express();
app.get('/', (req, res) => res.send('Bot running'));
app.listen(process.env.PORT || 3000, () => console.log('Keep-alive server listening'));

// --------------- Client ----------------
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel, Partials.Message]
});

// --------------- Snipe storage ----------------
const deletedMessages = new Map(); // channelId -> [ newest-first entries ]

client.on('messageDelete', message => {
  if (!message || !message.guild) return;
  const arr = deletedMessages.get(message.channel.id) || [];
  arr.unshift({
    authorId: message.author?.id ?? null,
    authorTag: message.author?.tag ?? 'Unknown',
    content: message.content ?? '',
    attachments: message.attachments?.map(a => ({ url: a.url, name: a.name })) ?? [],
    timestamp: Date.now()
  });
  if (arr.length > SNIPES_PER_CHANNEL) arr.length = SNIPES_PER_CHANNEL;
  deletedMessages.set(message.channel.id, arr);
});

// --------------- Helpers ----------------
async function fetchMemberSafe(guild, id) {
  try { return guild.members.cache.get(id) || await guild.members.fetch(id); } catch { return null; }
}
function parseMentionToId(mention) {
  if (!mention) return null;
  const m = mention.match(/^<@!?(\d+)>$/);
  return m ? m[1] : mention;
}
function sendModLog(guild, title, description, actor) {
  const logChannelId = process.env.LOG_CHANNEL_ID;
  if (!logChannelId) return;
  const ch = guild.channels.cache.get(logChannelId) || client.channels.cache.get(logChannelId);
  if (!ch) return;
  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setTimestamp()
    .setColor(0xFF0000)
    .addFields({ name: 'Moderator', value: actor?.tag ?? 'Unknown', inline: true });
  ch.send({ embeds: [embed] }).catch(() => {});
}

// --------------- Slash command definitions ----------------
const slashBuilders = [
  // Basic
  new SlashCommandBuilder().setName('ping').setDescription('Pong'),
  new SlashCommandBuilder().setName('help').setDescription('Show help (embed)'),
  new SlashCommandBuilder().setName('avatar').setDescription('Show avatar').addUserOption(o => o.setName('user').setDescription('User').setRequired(false)),
  new SlashCommandBuilder().setName('userinfo').setDescription('User info').addUserOption(o => o.setName('user').setDescription('User').setRequired(false)),
  new SlashCommandBuilder().setName('serverinfo').setDescription('Server info'),

  // Moderation
  new SlashCommandBuilder().setName('ban').setDescription('Ban member').addUserOption(o => o.setName('user').setDescription('User').setRequired(true)),
  new SlashCommandBuilder().setName('unban').setDescription('Unban by ID').addStringOption(o => o.setName('id').setDescription('User ID').setRequired(true)),
  new SlashCommandBuilder().setName('unbanall').setDescription('Unban all banned users'),
  new SlashCommandBuilder().setName('kick').setDescription('Kick member').addUserOption(o => o.setName('user').setDescription('User').setRequired(true)),
  new SlashCommandBuilder().setName('timeout').setDescription('Timeout user (seconds)').addUserOption(o => o.setName('user').setDescription('User').setRequired(true)).addIntegerOption(o => o.setName('duration').setDescription('Seconds').setRequired(true)),
  new SlashCommandBuilder().setName('untimeout').setDescription('Remove timeout').addUserOption(o => o.setName('user').setDescription('User').setRequired(true)),
  new SlashCommandBuilder().setName('untimeoutall').setDescription('Remove all timeouts'),

  // Purge
  new SlashCommandBuilder().setName('purge').setDescription('Delete messages').addIntegerOption(o => o.setName('amount').setDescription('1-100').setRequired(true)),
  new SlashCommandBuilder().setName('purgeuser').setDescription('Delete messages from user').addUserOption(o => o.setName('user').setDescription('User').setRequired(true)).addIntegerOption(o => o.setName('amount').setDescription('Max (<=100)').setRequired(true)),

  // Roles & nick
  new SlashCommandBuilder().setName('role').setDescription('Add role to user').addUserOption(o => o.setName('user').setDescription('User').setRequired(true)).addRoleOption(o => o.setName('role').setDescription('Role').setRequired(true)),
  new SlashCommandBuilder().setName('unrole').setDescription('Remove role from user').addUserOption(o => o.setName('user').setDescription('User').setRequired(true)).addRoleOption(o => o.setName('role').setDescription('Role').setRequired(true)),
  new SlashCommandBuilder().setName('nick').setDescription('Change nickname').addUserOption(o => o.setName('user').setDescription('User').setRequired(true)).addStringOption(o => o.setName('nickname').setDescription('Nickname').setRequired(true)),
  new SlashCommandBuilder().setName('nuke').setDescription('Nuke channel (delete recent messages)'),

  // Channel ops
  new SlashCommandBuilder().setName('lock').setDescription('Lock this channel'),
  new SlashCommandBuilder().setName('unlock').setDescription('Unlock this channel'),
  new SlashCommandBuilder().setName('hide').setDescription('Hide this channel'),
  new SlashCommandBuilder().setName('unhide').setDescription('Unhide this channel'),
  new SlashCommandBuilder().setName('lockall').setDescription('Lock all text channels'),
  new SlashCommandBuilder().setName('unlockall').setDescription('Unlock all text channels'),
  new SlashCommandBuilder().setName('hideall').setDescription('Hide all text channels'),
  new SlashCommandBuilder().setName('unhideall').setDescription('Unhide all text channels'),

  // Utility
  new SlashCommandBuilder().setName('steal').setDescription('Steal emoji (paste <:name:id>)').addStringOption(o => o.setName('emoji').setDescription('Emoji').setRequired(true)),
  new SlashCommandBuilder().setName('snipe').setDescription('Show last deleted message').addUserOption(o => o.setName('user').setDescription('Filter by user (optional)')),
  new SlashCommandBuilder().setName('afk').setDescription('Set AFK').addStringOption(o => o.setName('reason').setDescription('Reason')),
  new SlashCommandBuilder().setName('slowmode').setDescription('Set slowmode (seconds)').addIntegerOption(o => o.setName('duration').setDescription('Seconds').setRequired(true)),
  new SlashCommandBuilder().setName('slowmode_disable').setDescription('Disable slowmode'),
  new SlashCommandBuilder().setName('serverrename').setDescription('Rename server').addStringOption(o => o.setName('name').setDescription('New name').setRequired(true)),
  new SlashCommandBuilder().setName('setprefix').setDescription('Set prefix').addStringOption(o => o.setName('prefix').setDescription('New prefix').setRequired(true)),
  new SlashCommandBuilder().setName('stats').setDescription('Bot stats'),
  new SlashCommandBuilder().setName('uptime').setDescription('Uptime'),
  new SlashCommandBuilder().setName('invite').setDescription('Invite link'),

  // Lists
  new SlashCommandBuilder().setName('list_roles').setDescription('List roles'),
  new SlashCommandBuilder().setName('list_boosters').setDescription('List boosters'),
  new SlashCommandBuilder().setName('list_bots').setDescription('List bots'),
  new SlashCommandBuilder().setName('list_banned').setDescription('List banned users'),
  new SlashCommandBuilder().setName('list_admins').setDescription('List admins'),
  new SlashCommandBuilder().setName('list_moderators').setDescription('List moderators'),

  // Fun
  new SlashCommandBuilder().setName('say').setDescription('Make the bot say something').addStringOption(o => o.setName('text').setDescription('Text to say').setRequired(true))
].map(c => c.toJSON());

// --------------- Register commands (global + guild) ----------------
const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
(async () => {
  try {
    console.log('Registering global commands...');
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: slashBuilders });
    console.log('✅ Global commands registered.');

    if (process.env.GUILD_ID) {
      await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), { body: slashBuilders });
      console.log('⚡ Guild commands registered (instant).');
    }
  } catch (err) {
    console.error('Error registering commands:', err);
  }
})();

// --------------- Interaction (slash) handler ----------------
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  const { commandName, options, guild, member, channel, user } = interaction;

  try {
    // ----- Basic -----
    if (commandName === 'ping') return await interaction.reply('Pong!');
    if (commandName === 'help') {
      const embed = new EmbedBuilder()
        .setTitle('Help — Commands')
        .setDescription(`Use slash or your prefix (default \`${DEFAULT_PREFIX}\`).`)
        .addFields(
          { name: 'Moderation', value: 'ban, unban, unbanall, kick, timeout, untimeout, untimeoutall, purge, purgeuser, role, unrole, nick, nuke', inline: false },
          { name: 'Channel', value: 'lock, unlock, hide, unhide, lockall, unlockall, hideall, unhideall, slowmode, slowmode_disable', inline: false },
          { name: 'Utility', value: 'steal, snipe, afk, setprefix, stats, uptime, invite, say', inline: false },
          { name: 'Lists', value: 'list_roles, list_boosters, list_bots, list_banned, list_admins, list_moderators', inline: false }
        )
        .setColor(0x00AE86);
      return await interaction.reply({ embeds: [embed] });
    }
    if (commandName === 'avatar') {
      const u = options.getUser('user') || user;
      return await interaction.reply(u.displayAvatarURL({ size: 1024 }));
    }
    if (commandName === 'userinfo') {
      const u = options.getUser('user') || user;
      const mem = await fetchMemberSafe(guild, u.id);
      const embed = new EmbedBuilder()
        .setTitle(u.tag)
        .setThumbnail(u.displayAvatarURL({ size: 1024 }))
        .addFields(
          { name: 'ID', value: u.id, inline: true },
          { name: 'Created', value: u.createdAt.toDateString(), inline: true },
          { name: 'Joined', value: mem?.joinedAt ? mem.joinedAt.toDateString() : 'Unknown', inline: true }
        );
      return await interaction.reply({ embeds: [embed] });
    }
    if (commandName === 'serverinfo') {
      const g = guild;
      const embed = new EmbedBuilder()
        .setTitle(g.name)
        .setThumbnail(g.iconURL({ size: 1024 }))
        .addFields(
          { name: 'Members', value: `${g.memberCount}`, inline: true },
          { name: 'Owner', value: `<@${g.ownerId}>`, inline: true },
          { name: 'Created', value: g.createdAt.toDateString(), inline: true }
        );
      return await interaction.reply({ embeds: [embed] });
    }

    // ----- Moderation -----
    if (commandName === 'ban') {
      if (!member.permissions.has(PermissionFlagsBits.BanMembers)) return interaction.reply({ content: '❌ Missing Ban Members permission.', ephemeral: true });
      await interaction.reply({ content: 'Processing ban...', ephemeral: true });
      const u = options.getUser('user');
      await guild.members.ban(u.id, { reason: `Banned by ${member.user.tag}` }).catch(e => { console.error(e); });
      try { await interaction.editReply({ content: `✅ ${u.tag} banned.` }); } catch {}
      sendModLog(guild, 'User Banned', `${u.tag} (${u.id}) was banned.`, member.user);
      return;
    }

    if (commandName === 'unban') {
      if (!member.permissions.has(PermissionFlagsBits.BanMembers)) return interaction.reply({ content: '❌ Missing Ban Members permission.', ephemeral: true });
      const id = options.getString('id');
      await interaction.reply({ content: 'Processing unban...', ephemeral: true });
      try {
        await guild.bans.remove(id);
        await interaction.editReply({ content: `✅ Unbanned ${id} (attempted).` });
        sendModLog(guild, 'User Unbanned', `Attempted to unban ${id}`, member.user);
      } catch (e) {
        await interaction.editReply({ content: `❌ Could not unban ${id}.` });
      }
      return;
    }

    if (commandName === 'unbanall') {
      if (!member.permissions.has(PermissionFlagsBits.BanMembers)) return interaction.reply({ content: '❌ Missing Ban Members permission.', ephemeral: true });
      await interaction.reply({ content: 'Unbanning all... (may take time)', ephemeral: true });
      const bans = await guild.bans.fetch().catch(() => null);
      if (!bans) return interaction.editReply({ content: '❌ Could not fetch bans.' });
      let count = 0;
      for (const [id] of bans) {
        try { await guild.bans.remove(id); count++; } catch {}
      }
      await interaction.editReply({ content: `✅ Attempted to unban ${count} users.` });
      sendModLog(guild, 'Unban All', `Attempted to unban ${count} users.`, member.user);
      return;
    }

    if (commandName === 'kick') {
      if (!member.permissions.has(PermissionFlagsBits.KickMembers)) return interaction.reply({ content: '❌ Missing Kick Members permission.', ephemeral: true });
      await interaction.reply({ content: 'Processing kick...', ephemeral: true });
      const u = options.getUser('user');
      const target = await fetchMemberSafe(guild, u.id);
      if (!target) return interaction.editReply({ content: '❌ Member not found.' });
      await target.kick(`Kicked by ${member.user.tag}`).catch(() => {});
      await interaction.editReply({ content: `✅ ${u.tag} kicked.` });
      sendModLog(guild, 'User Kicked', `${u.tag} (${u.id}) was kicked.`, member.user);
      return;
    }

    if (commandName === 'timeout') {
      if (!member.permissions.has(PermissionFlagsBits.ModerateMembers)) return interaction.reply({ content: '❌ Missing Moderate Members permission.', ephemeral: true });
      await interaction.reply({ content: 'Processing timeout...', ephemeral: true });
      const u = options.getUser('user');
      const duration = options.getInteger('duration') * 1000;
      const t = await fetchMemberSafe(guild, u.id);
      if (!t) return interaction.editReply({ content: '❌ Member not found.' });
      await t.timeout(duration, `Timed out by ${member.user.tag}`).catch(()=>{});
      await interaction.editReply({ content: `✅ ${u.tag} timed out for ${options.getInteger('duration')}s.` });
      sendModLog(guild, 'User Timed Out', `${u.tag} (${u.id}) timed out for ${options.getInteger('duration')}s.`, member.user);
      return;
    }

    if (commandName === 'untimeout') {
      if (!member.permissions.has(PermissionFlagsBits.ModerateMembers)) return interaction.reply({ content: '❌ Missing Moderate Members permission.', ephemeral: true });
      await interaction.reply({ content: 'Processing...', ephemeral: true });
      const u = options.getUser('user');
      const t = await fetchMemberSafe(guild, u.id);
      if (!t) return interaction.editReply({ content: '❌ Member not found.' });
      await t.timeout(null).catch(()=>{});
      await interaction.editReply({ content: `✅ ${u.tag} un-timed out.` });
      sendModLog(guild, 'User Untimed Out', `${u.tag} (${u.id}) timeout removed.`, member.user);
      return;
    }

    if (commandName === 'untimeoutall') {
      if (!member.permissions.has(PermissionFlagsBits.ModerateMembers)) return interaction.reply({ content: '❌ Missing permission.', ephemeral: true });
      await interaction.reply({ content: 'Removing timeouts (best-effort)...', ephemeral: true });
      let removed = 0;
      guild.members.cache.forEach(m => { if (m.communicationDisabledUntil) try { m.timeout(null); removed++; } catch {} });
      await interaction.editReply({ content: `✅ Attempted to remove timeouts from ${removed} members.` });
      sendModLog(guild, 'Untimeout All', `Attempted to remove timeouts from ${removed} members.`, member.user);
      return;
    }

    // ----- Purge -----
    if (commandName === 'purge') {
      if (!member.permissions.has(PermissionFlagsBits.ManageMessages)) return interaction.reply({ content: '❌ Missing Manage Messages permission.', ephemeral: true });
      await interaction.reply({ content: 'Deleting messages...', ephemeral: true });
      const amount = Math.min(options.getInteger('amount') || 0, 100);
      if (amount < 1) return interaction.editReply({ content: '❌ Provide amount 1-100.' });
      const msgs = await channel.messages.fetch({ limit: amount }).catch(()=>null);
      if (!msgs) return interaction.editReply({ content: '❌ Could not fetch messages.' });
      await channel.bulkDelete(msgs, true).catch(()=>{});
      await interaction.editReply({ content: `✅ Deleted ${msgs.size} messages.` });
      sendModLog(guild, 'Purge', `Deleted ${msgs.size} messages in ${channel.name}.`, member.user);
      return;
    }

    if (commandName === 'purgeuser') {
      if (!member.permissions.has(PermissionFlagsBits.ManageMessages)) return interaction.reply({ content: '❌ Missing Manage Messages permission.', ephemeral: true });
      await interaction.reply({ content: 'Searching messages...', ephemeral: true });
      const u = options.getUser('user'); const amount = Math.min(options.getInteger('amount') || 0, 100);
      const msgs = await channel.messages.fetch({ limit: 100 }).catch(()=>null);
      if (!msgs) return interaction.editReply({ content: '❌ Could not fetch messages.' });
      const userMsgs = msgs.filter(m => m.author && m.author.id === u.id).first(amount);
      if (!userMsgs.length) return interaction.editReply({ content: `✅ No recent messages found from ${u.tag}.` });
      await channel.bulkDelete(userMsgs, true).catch(()=>{});
      await interaction.editReply({ content: `✅ Deleted ${userMsgs.length} messages from ${u.tag}.` });
      sendModLog(guild, 'Purge User', `Deleted ${userMsgs.length} messages from ${u.tag} in ${channel.name}.`, member.user);
      return;
    }

    // ----- Roles / Nick -----
    if (commandName === 'role') {
      if (!member.permissions.has(PermissionFlagsBits.ManageRoles)) return interaction.reply({ content: '❌ Missing Manage Roles permission.', ephemeral: true });
      const u = options.getUser('user'); const role = options.getRole('role');
      const t = await fetchMemberSafe(guild, u.id);
      if (!t) return interaction.reply({ content: '❌ Member not found.', ephemeral: true });
      await t.roles.add(role).catch(()=>{});
      await interaction.reply({ content: `✅ Added ${role.name} to ${u.tag}.` });
      sendModLog(guild, 'Role Added', `${role.name} added to ${u.tag}.`, member.user);
      return;
    }

    if (commandName === 'unrole') {
      if (!member.permissions.has(PermissionFlagsBits.ManageRoles)) return interaction.reply({ content: '❌ Missing Manage Roles permission.', ephemeral: true });
      const u = options.getUser('user'); const role = options.getRole('role');
      const t = await fetchMemberSafe(guild, u.id);
      if (!t) return interaction.reply({ content: '❌ Member not found.', ephemeral: true });
      await t.roles.remove(role).catch(()=>{});
      await interaction.reply({ content: `✅ Removed ${role.name} from ${u.tag}.` });
      sendModLog(guild, 'Role Removed', `${role.name} removed from ${u.tag}.`, member.user);
      return;
    }

    if (commandName === 'nick') {
      if (!member.permissions.has(PermissionFlagsBits.ManageNicknames)) return interaction.reply({ content: '❌ Missing Manage Nicknames permission.', ephemeral: true });
      const u = options.getUser('user'); const nickname = options.getString('nickname');
      const t = await fetchMemberSafe(guild, u.id);
      if (!t) return interaction.reply({ content: '❌ Member not found.', ephemeral: true });
      await t.setNickname(nickname).catch(()=>{});
      await interaction.reply({ content: `✅ Nick changed to ${nickname} for ${u.tag}.` });
      sendModLog(guild, 'Nickname Changed', `${u.tag} nickname changed to ${nickname}.`, member.user);
      return;
    }

    // ----- Nuke (delete recent messages) -----
    if (commandName === 'nuke') {
      if (!member.permissions.has(PermissionFlagsBits.ManageChannels)) return interaction.reply({ content: '❌ Missing Manage Channels permission.', ephemeral: true });
      await interaction.reply({ content: 'Nuking channel (deleting recent messages)...', ephemeral: true });
      const msgs = await channel.messages.fetch({ limit: 100 }).catch(()=>null);
      if (msgs) await channel.bulkDelete(msgs, true).catch(()=>{});
      await interaction.editReply({ content: `💣 Channel nuked (deleted up to 100 recent messages).` });
      sendModLog(guild, 'Nuke', `Nuked ${channel.name}.`, member.user);
      return;
    }

    // ----- Channel lock/unlock/hide/unhide (single & all) -----
    if (commandName === 'lock') {
      if (!member.permissions.has(PermissionFlagsBits.ManageChannels)) return interaction.reply({ content: '❌ Missing Manage Channels.', ephemeral: true });
      await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: false }).catch(()=>{});
      await interaction.reply({ content: '🔒 Channel locked.' });
      sendModLog(guild, 'Channel Locked', `${channel.name} locked.`, member.user);
      return;
    }
    if (commandName === 'unlock') {
      if (!member.permissions.has(PermissionFlagsBits.ManageChannels)) return interaction.reply({ content: '❌ Missing Manage Channels.', ephemeral: true });
      await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: true }).catch(()=>{});
      await interaction.reply({ content: '🔓 Channel unlocked.' });
      sendModLog(guild, 'Channel Unlocked', `${channel.name} unlocked.`, member.user);
      return;
    }
    if (commandName === 'hide') {
      if (!member.permissions.has(PermissionFlagsBits.ManageChannels)) return interaction.reply({ content: '❌ Missing Manage Channels.', ephemeral: true });
      await channel.permissionOverwrites.edit(guild.roles.everyone, { ViewChannel: false }).catch(()=>{});
      await interaction.reply({ content: '🙈 Channel hidden.' });
      sendModLog(guild, 'Channel Hidden', `${channel.name} hidden.`, member.user);
      return;
    }
    if (commandName === 'unhide') {
      if (!member.permissions.has(PermissionFlagsBits.ManageChannels)) return interaction.reply({ content: '❌ Missing Manage Channels.', ephemeral: true });
      await channel.permissionOverwrites.edit(guild.roles.everyone, { ViewChannel: true }).catch(()=>{});
      await interaction.reply({ content: '👀 Channel unhidden.' });
      sendModLog(guild, 'Channel Unhidden', `${channel.name} unhidden.`, member.user);
      return;
    }
    if (commandName === 'lockall') {
      if (!member.permissions.has(PermissionFlagsBits.ManageChannels)) return interaction.reply({ content: '❌ Missing Manage Channels.', ephemeral: true });
      await interaction.reply({ content: 'Locking all text channels...', ephemeral: true });
      guild.channels.cache.filter(ch => ch.type === ChannelType.GuildText).forEach(ch => ch.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: false }).catch(()=>{}));
      await interaction.editReply({ content: '🔒 All text channels processed (locked).' });
      sendModLog(guild, 'Lock All', 'Locked all text channels (attempted).', member.user);
      return;
    }
    if (commandName === 'unlockall') {
      if (!member.permissions.has(PermissionFlagsBits.ManageChannels)) return interaction.reply({ content: '❌ Missing Manage Channels.', ephemeral: true });
      await interaction.reply({ content: 'Unlocking all text channels...', ephemeral: true });
      guild.channels.cache.filter(ch => ch.type === ChannelType.GuildText).forEach(ch => ch.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: true }).catch(()=>{}));
      await interaction.editReply({ content: '🔓 All text channels processed (unlocked).' });
      sendModLog(guild, 'Unlock All', 'Unlocked all text channels (attempted).', member.user);
      return;
    }
    if (commandName === 'hideall') {
      if (!member.permissions.has(PermissionFlagsBits.ManageChannels)) return interaction.reply({ content: '❌ Missing Manage Channels.', ephemeral: true });
      await interaction.reply({ content: 'Hiding all text channels...', ephemeral: true });
      guild.channels.cache.filter(ch => ch.type === ChannelType.GuildText).forEach(ch => ch.permissionOverwrites.edit(guild.roles.everyone, { ViewChannel: false }).catch(()=>{}));
      await interaction.editReply({ content: '🙈 All text channels processed (hidden).' });
      sendModLog(guild, 'Hide All', 'Hidden all text channels (attempted).', member.user);
      return;
    }
    if (commandName === 'unhideall') {
      if (!member.permissions.has(PermissionFlagsBits.ManageChannels)) return interaction.reply({ content: '❌ Missing Manage Channels.', ephemeral: true });
      await interaction.reply({ content: 'Unhiding all text channels...', ephemeral: true });
      guild.channels.cache.filter(ch => ch.type === ChannelType.GuildText).forEach(ch => ch.permissionOverwrites.edit(guild.roles.everyone, { ViewChannel: true }).catch(()=>{}));
      await interaction.editReply({ content: '👀 All text channels processed (unhidden).' });
      sendModLog(guild, 'Unhide All', 'Unhidden all text channels (attempted).', member.user);
      return;
    }

    // ----- Steal emoji -----
    if (commandName === 'steal') {
      if (!member.permissions.has(PermissionFlagsBits.ManageEmojisAndStickers)) return interaction.reply({ content: '❌ Missing Manage Emojis permission.', ephemeral: true });
      await interaction.reply({ content: 'Attempting to steal emoji...', ephemeral: true });
      const emojiInput = options.getString('emoji');
      const match = emojiInput.match(/<a?:\w+:(\d+)>/);
      if (!match) return interaction.editReply({ content: '❌ Invalid emoji format. Use <:name:id> or <a:name:id>' });
      const id = match[1];
      const ext = emojiInput.startsWith('<a:') ? 'gif' : 'png';
      const url = `https://cdn.discordapp.com/emojis/${id}.${ext}`;
      try {
        const created = await guild.emojis.create({ attachment: url, name: `emoji_${id}` });
        await interaction.editReply({ content: `✅ Emoji added: <:${created.name}:${created.id}>` });
        sendModLog(guild, 'Emoji Stolen', `Added emoji ${created.name}`, member.user);
      } catch (e) {
        await interaction.editReply({ content: '❌ Failed to add emoji. Check permissions and slots.' });
      }
      return;
    }

    // ----- AFK -----
    if (commandName === 'afk') {
      const reason = options.getString('reason') || 'AFK';
      afkMap.set(member.user.id, { reason, at: Date.now() });
      return interaction.reply({ content: `✅ AFK set: ${reason}` });
    }

    // ----- Snipe -----
    if (commandName === 'snipe') {
      const filterUser = options.getUser('user');
      const arr = deletedMessages.get(channel.id) || [];
      if (!arr.length) return interaction.reply({ content: 'No deleted messages to snipe here.', ephemeral: true });
      let entry;
      if (filterUser) {
        const matches = arr.filter(e => e.authorId === filterUser.id);
        if (!matches.length) return interaction.reply({ content: `No deleted messages by ${filterUser.tag} here.`, ephemeral: true });
        entry = matches[0];
        const count = matches.length;
        const suffix = count > 1 ? ` (User deleted messages ${count})` : '';
        return interaction.reply({ content: `🕵️ ${entry.authorTag}${suffix}\n\n${entry.content || '[no text]'}${entry.attachments.length ? `\nAttachments:\n${entry.attachments.map(a=>a.url).join('\n')}` : ''}` });
      } else {
        entry = arr[0];
        const count = arr.filter(e => e.authorId === entry.authorId).length;
        const suffix = count > 1 ? ` (User deleted messages ${count})` : '';
        return interaction.reply({ content: `🕵️ ${entry.authorTag}${suffix}\n\n${entry.content || '[no text]'}${entry.attachments.length ? `\nAttachments:\n${entry.attachments.map(a=>a.url).join('\n')}` : ''}` });
      }
    }

    // ----- Slowmode -----
    if (commandName === 'slowmode') {
      if (!member.permissions.has(PermissionFlagsBits.ManageChannels)) return interaction.reply({ content: '❌ Missing Manage Channels permission.', ephemeral: true });
      const duration = options.getInteger('duration') || 0;
      await channel.setRateLimitPerUser(duration).catch(()=>{});
      return interaction.reply({ content: `⏱ Slowmode set to ${duration}s.` });
    }
    if (commandName === 'slowmode_disable') {
      if (!member.permissions.has(PermissionFlagsBits.ManageChannels)) return interaction.reply({ content: '❌ Missing Manage Channels permission.', ephemeral: true });
      await channel.setRateLimitPerUser(0).catch(()=>{});
      return interaction.reply({ content: '⏱ Slowmode disabled.' });
    }

    // ----- Server rename -----
    if (commandName === 'serverrename') {
      if (!member.permissions.has(PermissionFlagsBits.ManageGuild)) return interaction.reply({ content: '❌ Missing Manage Server.', ephemeral: true });
      const name = options.getString('name');
      await guild.setName(name).catch(()=>{});
      await interaction.reply({ content: `✅ Server renamed to ${name}` });
      sendModLog(guild, 'Server Renamed', `Renamed to ${name}`, member.user);
      return;
    }

    // ----- Set prefix -----
    if (commandName === 'setprefix') {
      if (!member.permissions.has(PermissionFlagsBits.ManageGuild)) return interaction.reply({ content: '❌ Missing Manage Server permission.', ephemeral: true });
      const np = options.getString('prefix');
      prefixes[guild.id] = np;
      savePrefixes();
      return interaction.reply({ content: `✅ Prefix set to \`${np}\` for this server.` });
    }

    // ----- Stats / Uptime / Invite / Say / Lists -----
    if (commandName === 'stats') return interaction.reply({ content: `Servers (cached): ${client.guilds.cache.size}\nUsers (cached): ${client.users.cache.size}` });
    if (commandName === 'uptime') return interaction.reply({ content: `Uptime: ${Math.floor(client.uptime/1000)} seconds` });
    if (commandName === 'invite') return interaction.reply({ content: `Invite: https://discord.com/oauth2/authorize?client_id=${client.user?.id || process.env.CLIENT_ID}&scope=bot%20applications.commands&permissions=8` });
    if (commandName === 'say') {
      const text = options.getString('text');
      await interaction.reply({ content: '✅ Message sent (ephemeral).', ephemeral: true });
      channel.send(text).catch(()=>{});
      return;
    }

    // ----- Listings -----
    if (commandName === 'list_roles') {
      const names = guild.roles.cache.map(r => r.name).join(', ') || 'No roles';
      return interaction.reply({ content: `Roles: ${names}`, ephemeral: true });
    }
    if (commandName === 'list_boosters') {
      const boosters = guild.members.cache.filter(m => m.premiumSince).map(m => m.user.tag).join(', ') || 'No boosters';
      return interaction.reply({ content: `Boosters: ${boosters}`, ephemeral: true });
    }
    if (commandName === 'list_bots') {
      const bots = guild.members.cache.filter(m => m.user.bot).map(m => m.user.tag).join(', ') || 'No bots';
      return interaction.reply({ content: `Bots: ${bots}`, ephemeral: true });
    }
    if (commandName === 'list_banned') {
      await interaction.reply({ content: 'Fetching bans...', ephemeral: true });
      const bans = await guild.bans.fetch().catch(()=>null);
      const names = bans ? bans.map(b => b.user.tag).join(', ') : 'No bans or failed to fetch';
      return interaction.editReply({ content: `Banned users: ${names}` });
    }
    if (commandName === 'list_admins') {
      const admins = guild.members.cache.filter(m => m.permissions.has(PermissionFlagsBits.Administrator)).map(m => m.user.tag).join(', ') || 'No admins';
      return interaction.reply({ content: `Admins: ${admins}`, ephemeral: true });
    }
    if (commandName === 'list_moderators') {
      const mods = guild.members.cache.filter(m => m.permissions.has(PermissionFlagsBits.KickMembers)).map(m => m.user.tag).join(', ') || 'No moderators';
      return interaction.reply({ content: `Moderators: ${mods}`, ephemeral: true });
    }

    // fallback
    return interaction.reply({ content: 'Command processed.', ephemeral: true });

  } catch (err) {
    console.error('Interaction error:', err);
    try { if (interaction.replied || interaction.deferred) await interaction.editReply({ content: '❌ Error executing command.' }); else await interaction.reply({ content: '❌ Error executing command.', ephemeral: true }); } catch {}
  }
});

// --------------- Prefix (message) handler ----------------
client.on('messageCreate', async message => {
  try {
    if (!message.guild || message.author.bot) return;

    // AFK remove / mention notifications
    if (afkMap.has(message.author.id)) {
      afkMap.delete(message.author.id);
      message.channel.send(`${message.author.tag}, your AFK has been removed.`).catch(()=>{});
    }
    if (message.mentions.users.size) {
      for (const [, u] of message.mentions.users) {
        const info = afkMap.get(u.id);
        if (info) message.channel.send(`${u.tag} is AFK: ${info.reason}`).catch(()=>{});
      }
    }

    // reload prefixes safely
    try { prefixes = JSON.parse(fs.readFileSync(PREFIXES_FILE, 'utf8') || '{}'); } catch {}

    const prefix = prefixes[message.guild.id] || DEFAULT_PREFIX;
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/\s+/);
    const cmd = args.shift().toLowerCase();

    // Basic
    if (cmd === 'ping') return message.reply('Pong!').catch(()=>{});
    if (cmd === 'help') {
      const embed = new EmbedBuilder().setTitle('Help').setDescription(`Use slash or prefix. Default prefix: \`${DEFAULT_PREFIX}\``).setColor(0x00AE86);
      return message.reply({ embeds: [embed] }).catch(()=>{});
    }

    // setprefix
    if (cmd === 'setprefix') {
      if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) return message.reply('❌ You need Manage Server permission.');
      const np = args[0];
      if (!np) return message.reply('❌ Provide prefix.');
      prefixes[message.guild.id] = np;
      savePrefixes();
      return message.reply(`✅ Prefix set to \`${np}\``);
    }

    // ban (prefix)
    if (cmd === 'ban') {
      if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) return message.reply('❌ Missing permission.');
      const id = parseMentionToId(args[0]);
      if (!id) return message.reply('❌ Provide mention or id.');
      await message.guild.members.ban(id, { reason: `Banned by ${message.author.tag}` }).catch(() => message.reply('❌ Failed to ban.'));
      message.reply(`✅ Banned <@${id}> (attempted).`).catch(()=>{});
      sendModLog(message.guild, 'User Banned', `Banned <@${id}>`, message.author);
      return;
    }

    // kick (prefix)
    if (cmd === 'kick') {
      if (!message.member.permissions.has(PermissionFlagsBits.KickMembers)) return message.reply('❌ Missing permission.');
      const id = parseMentionToId(args[0]);
      const member = await fetchMemberSafe(message.guild, id);
      if (!member) return message.reply('❌ Member not found.');
      await member.kick(`Kicked by ${message.author.tag}`).catch(()=>{});
      message.reply(`✅ Kicked ${member.user.tag}.`).catch(()=>{});
      sendModLog(message.guild, 'User Kicked', `Kicked ${member.user.tag}`, message.author);
      return;
    }

    // purge (prefix)
    if (cmd === 'purge' || cmd === 'clear') {
      if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) return message.reply('❌ Missing permission.');
      const amount = Math.min(parseInt(args[0]) || 0, 100);
      if (amount < 1) return message.reply('❌ Provide amount 1-100.');
      const msgs = await message.channel.messages.fetch({ limit: amount });
      await message.channel.bulkDelete(msgs, true).catch(()=>{});
      return message.reply(`✅ Deleted ${msgs.size} messages.`).then(m => setTimeout(()=>m.delete().catch(()=>{}), 3000)).catch(()=>{});
    }

    // snipe (prefix)
    if (cmd === 'snipe') {
      const mention = args[0] ? parseMentionToId(args[0]) : null;
      const arr = deletedMessages.get(message.channel.id) || [];
      if (!arr.length) return message.reply('No deleted messages to snipe here.');
      let entry;
      if (mention) {
        const matches = arr.filter(e => e.authorId === mention);
        if (!matches.length) return message.reply('No deleted messages from that user in this channel.');
        entry = matches[0];
        const count = matches.length;
        const suffix = count > 1 ? ` (User deleted messages ${count})` : '';
        return message.reply(`🕵️ ${entry.authorTag}${suffix}\n\n${entry.content || '[no text]'}${entry.attachments.length ? `\nAttachments:\n${entry.attachments.map(a=>a.url).join('\n')}` : ''}`).catch(()=>{});
      } else {
        entry = arr[0];
        const count = arr.filter(e => e.authorId === entry.authorId).length;
        const suffix = count > 1 ? ` (User deleted messages ${count})` : '';
        return message.reply(`🕵️ ${entry.authorTag}${suffix}\n\n${entry.content || '[no text]'}${entry.attachments.length ? `\nAttachments:\n${entry.attachments.map(a=>a.url).join('\n')}` : ''}`).catch(()=>{});
      }
    }

    // say (prefix)
    if (cmd === 'say') {
      const text = args.join(' ');
      if (!text) return message.reply('❌ Provide text.');
      await message.channel.send(text).catch(()=>{});
      return message.delete().catch(()=>{});
    }

    // other prefix commands can be added similarly (role/unrole/nick/lock etc.)
    // For brevity many prefix equivalents mirror slash commands above; add similarly if you want them to behave differently.

  } catch (err) {
    console.error('Prefix handler error:', err);
    try { await message.reply('❌ Error executing command.'); } catch {}
  }
});

// --------------- AFK map ----------------
const afkMap = new Map(); // userId -> { reason, at }

// --------------- Ready & Login ----------------
client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  try {
    client.user.setActivity(`Type ${DEFAULT_PREFIX}help | /help`, { type: 3 });
  } catch (err) {
    console.error('Failed to set activity:', err);
  }
});

// --------------- Login ----------------
if (!process.env.TOKEN) {
  console.error('Missing TOKEN environment variable. Set TOKEN in Render environment variables.');
  process.exit(1);
}
client.login(process.env.TOKEN);
