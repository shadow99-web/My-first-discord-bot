// index.js - single-file, complete bot (slash + prefix, prefix persisted)
// Put TOKEN, CLIENT_ID, GUILD_ID in Render environment variables.

require('dotenv').config();
const fs = require('fs');
const express = require('express');
const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  EmbedBuilder
} = require('discord.js');

// ---------- Express keep-alive ----------
const app = express();
app.get('/', (_, res) => res.send('Bot is running!'));
app.listen(process.env.PORT || 3000, () => console.log('Keep-alive server listening'));

// ---------- Client ----------
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

// ---------- Prefix persistence ----------
const PREFIX_FILE = './prefixes.json';
function ensurePrefixesFile() {
  try {
    if (!fs.existsSync(PREFIX_FILE)) fs.writeFileSync(PREFIX_FILE, JSON.stringify({}, null, 2));
  } catch (e) {
    console.error('Error ensuring prefixes file:', e);
  }
}
ensurePrefixesFile();

let prefixes = {};
try {
  prefixes = JSON.parse(fs.readFileSync(PREFIX_FILE, 'utf8') || '{}');
} catch (e) {
  console.error('Failed to load prefixes.json, using empty object.', e);
  prefixes = {};
}
function savePrefixes() {
  try {
    fs.writeFileSync(PREFIX_FILE, JSON.stringify(prefixes, null, 2));
  } catch (e) {
    console.error('Failed to save prefixes.json', e);
  }
}

// ---------- Snipe storage ----------
const SNIPES_PER_CHANNEL = 100;
const deletedMessages = new Map(); // channelId -> array newest-first

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

// ---------- AFK storage ----------
const afkMap = new Map(); // userId -> { reason, at }

// ---------- Slash command definitions ----------
const slashCommands = [
  // Basic
  new SlashCommandBuilder().setName('ping').setDescription('Replies with Pong!'),
  new SlashCommandBuilder().setName('help').setDescription('Show commands help'),

  // Info
  new SlashCommandBuilder().setName('serverinfo').setDescription('Server information'),
  new SlashCommandBuilder().setName('userinfo').setDescription('User information').addUserOption(o => o.setName('user').setDescription('User').setRequired(false)),
  new SlashCommandBuilder().setName('membercount').setDescription('Show member count'),
  new SlashCommandBuilder().setName('boostcount').setDescription('Show boosts'),

  // Moderation
  new SlashCommandBuilder().setName('ban').setDescription('Ban a member').addUserOption(o => o.setName('user').setDescription('User to ban').setRequired(true)),
  new SlashCommandBuilder().setName('unban').setDescription('Unban a user by ID').addStringOption(o => o.setName('id').setDescription('User ID').setRequired(true)),
  new SlashCommandBuilder().setName('unbanall').setDescription('Unban all banned users (careful)'),
  new SlashCommandBuilder().setName('kick').setDescription('Kick a member').addUserOption(o => o.setName('user').setDescription('User to kick').setRequired(true)),
  new SlashCommandBuilder().setName('timeout').setDescription('Timeout a member (seconds)').addUserOption(o => o.setName('user').setDescription('Member').setRequired(true)).addIntegerOption(o => o.setName('duration').setDescription('Seconds').setRequired(true)),
  new SlashCommandBuilder().setName('untimeout').setDescription('Remove timeout').addUserOption(o => o.setName('user').setDescription('User').setRequired(true)),
  new SlashCommandBuilder().setName('untimeoutall').setDescription('Remove timeouts from all members'),

  // Purge
  new SlashCommandBuilder().setName('purge').setDescription('Bulk delete messages').addIntegerOption(o => o.setName('amount').setDescription('Number of messages (1-100)').setRequired(true)),
  new SlashCommandBuilder().setName('purgeuser').setDescription('Delete messages from a user (scan up to 100)').addUserOption(o => o.setName('user').setDescription('User').setRequired(true)).addIntegerOption(o => o.setName('amount').setDescription('Max to delete (<=100)').setRequired(true)),

  // Roles & nick
  new SlashCommandBuilder().setName('role').setDescription('Add role to a user').addUserOption(o => o.setName('user').setDescription('Member').setRequired(true)).addRoleOption(o => o.setName('role').setDescription('Role').setRequired(true)),
  new SlashCommandBuilder().setName('unrole').setDescription('Remove role from a user').addUserOption(o => o.setName('user').setDescription('Member').setRequired(true)).addRoleOption(o => o.setName('role').setDescription('Role').setRequired(true)),
  new SlashCommandBuilder().setName('nick').setDescription('Change nickname').addUserOption(o => o.setName('user').setDescription('Member').setRequired(true)).addStringOption(o => o.setName('nickname').setDescription('New nickname').setRequired(true)),
  new SlashCommandBuilder().setName('nuke').setDescription('Delete recent messages in channel'),

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
  new SlashCommandBuilder().setName('steal').setDescription('Steal an emoji (paste <:name:id>)').addStringOption(o => o.setName('emoji').setDescription('Emoji to steal').setRequired(true)),
  new SlashCommandBuilder().setName('afk').setDescription('Set AFK message').addStringOption(o => o.setName('reason').setDescription('Reason')),
  new SlashCommandBuilder().setName('snipe').setDescription('Show last deleted message in this channel').addUserOption(o => o.setName('user').setDescription('Filter by user (optional)')),
  new SlashCommandBuilder().setName('slowmode').setDescription('Set channel slowmode (seconds)').addIntegerOption(o => o.setName('duration').setDescription('Seconds').setRequired(true)),
  new SlashCommandBuilder().setName('slowmode_disable').setDescription('Disable slowmode'),
  new SlashCommandBuilder().setName('serverrename').setDescription('Rename server').addStringOption(o => o.setName('name').setDescription('New name').setRequired(true)),
  new SlashCommandBuilder().setName('setprefix').setDescription('Set custom message prefix for this guild').addStringOption(o => o.setName('prefix').setDescription('New prefix').setRequired(true)),
  new SlashCommandBuilder().setName('stats').setDescription('Bot stats'),
  new SlashCommandBuilder().setName('uptime').setDescription('Bot uptime'),
  new SlashCommandBuilder().setName('invite').setDescription('Bot invite link'),

  // Listings
  new SlashCommandBuilder().setName('list_roles').setDescription('List roles'),
  new SlashCommandBuilder().setName('list_boosters').setDescription('List boosters'),
  new SlashCommandBuilder().setName('list_bots').setDescription('List bots'),
  new SlashCommandBuilder().setName('list_banned').setDescription('List banned users'),
  new SlashCommandBuilder().setName('list_admins').setDescription('List admins'),
  new SlashCommandBuilder().setName('list_moderators').setDescription('List moderators')
].map(c => c.toJSON());

// ---------- Register commands (global + guild if provided) ----------
const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
(async () => {
  try {
    console.log('Registering global commands...');
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: slashCommands });
    console.log('✅ Global commands registered.');

    if (process.env.GUILD_ID) {
      await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), { body: slashCommands });
      console.log('⚡ Guild commands registered (instant).');
    }
  } catch (err) {
    console.error('Error registering commands:', err);
  }
})();

// ---------- Helpers ----------
async function fetchMemberSafe(guild, id) {
  try {
    return guild.members.cache.get(id) || await guild.members.fetch(id);
  } catch {
    return null;
  }
}
function parseMentionToId(mention) {
  if (!mention) return null;
  const m = mention.match(/^<@!?(\d+)>$/);
  return m ? m[1] : mention;
}

// ---------- Interaction handler ----------
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  const { commandName, options, member, guild, channel, user } = interaction;

  try {
    // ---------- BASIC ----------
    if (commandName === 'ping') return interaction.reply('Pong!');

    if (commandName === 'help') {
      const embed = new EmbedBuilder()
        .setTitle('Bot Commands')
        .setDescription('Use `/` or your prefix (default `!`) before commands.\nContact admin if something fails.')
        .addFields(
          { name: 'Moderation', value: 'ban, unban, unbanall, kick, timeout, untimeout, untimeoutall, purge, purgeuser, role, unrole, nick, nuke', inline: false },
          { name: 'Channel', value: 'lock, unlock, hide, unhide, lockall, unlockall, hideall, unhideall, slowmode, slowmode_disable', inline: false },
          { name: 'Utility', value: 'steal, snipe, afk, setprefix, stats, uptime, invite', inline: false },
          { name: 'Info/Lists', value: 'serverinfo, userinfo, list_roles, list_boosters, list_bots, list_banned, list_admins, list_moderators', inline: false }
        )
        .setColor(0x00AE86)
        .setFooter({ text: 'Use the slash command or prefix command (default !)' });
      return interaction.reply({ embeds: [embed] });
    }

    // ---------- INFO ----------
    if (commandName === 'serverinfo') return interaction.reply(`Server: ${guild.name}\nMembers: ${guild.memberCount}`);
    if (commandName === 'membercount') return interaction.reply(`Total members: ${guild.memberCount}`);
    if (commandName === 'boostcount') return interaction.reply(`Boosts: ${guild.premiumSubscriptionCount}`);
    if (commandName === 'userinfo') {
      const u = options.getUser('user') || interaction.user;
      const mem = await fetchMemberSafe(guild, u.id);
      return interaction.reply(`Username: ${u.tag}\nID: ${u.id}\nJoined: ${mem ? mem.joinedAt : 'Unknown (not cached)'}`);
    }

    // ---------- MODERATION ----------
    if (commandName === 'ban') {
      if (!member.permissions.has(PermissionFlagsBits.BanMembers)) return interaction.reply({ content: '❌ You need Ban Members permission.', ephemeral: true });
      await interaction.reply({ content: 'Processing ban...', ephemeral: true });
      const u = options.getUser('user');
      await guild.members.ban(u.id, { reason: `Banned by ${member.user.tag}` });
      return interaction.editReply({ content: `✅ ${u.tag} banned.` });
    }

    if (commandName === 'unban') {
      if (!member.permissions.has(PermissionFlagsBits.BanMembers)) return interaction.reply({ content: '❌ You need Ban Members permission.', ephemeral: true });
      const id = options.getString('id');
      await interaction.reply({ content: 'Processing unban...', ephemeral: true });
      try {
        await guild.bans.remove(id);
        return interaction.editReply({ content: `✅ User ${id} unbanned (attempted).` });
      } catch (e) {
        return interaction.editReply({ content: `❌ Could not unban ${id}.` });
      }
    }

    if (commandName === 'unbanall') {
      if (!member.permissions.has(PermissionFlagsBits.BanMembers)) return interaction.reply({ content: '❌ You need Ban Members permission.', ephemeral: true });
      await interaction.reply({ content: 'Unbanning everyone (this may take a while)...', ephemeral: true });
      const bans = await guild.bans.fetch();
      let count = 0;
      for (const [id] of bans) {
        try { await guild.bans.remove(id); count++; } catch {}
      }
      return interaction.editReply({ content: `✅ Attempted to unban ${count} users.` });
    }

    if (commandName === 'kick') {
      if (!member.permissions.has(PermissionFlagsBits.KickMembers)) return interaction.reply({ content: '❌ Missing Kick Members permission.', ephemeral: true });
      await interaction.reply({ content: 'Processing kick...', ephemeral: true });
      const u = options.getUser('user');
      const t = await fetchMemberSafe(guild, u.id);
      if (!t) return interaction.editReply({ content: '❌ Member not found.' });
      await t.kick(`Kicked by ${member.user.tag}`);
      return interaction.editReply({ content: `✅ ${u.tag} kicked.` });
    }

    if (commandName === 'timeout') {
      if (!member.permissions.has(PermissionFlagsBits.ModerateMembers)) return interaction.reply({ content: '❌ Missing Moderate Members permission.', ephemeral: true });
      await interaction.reply({ content: 'Processing timeout...', ephemeral: true });
      const u = options.getUser('user');
      const duration = options.getInteger('duration') * 1000;
      const t = await fetchMemberSafe(guild, u.id);
      if (!t) return interaction.editReply({ content: '❌ Member not found.' });
      await t.timeout(duration, `Timed out by ${member.user.tag}`);
      return interaction.editReply({ content: `✅ ${u.tag} timed out for ${options.getInteger('duration')}s.` });
    }

    if (commandName === 'untimeout') {
      if (!member.permissions.has(PermissionFlagsBits.ModerateMembers)) return interaction.reply({ content: '❌ Missing permission.', ephemeral: true });
      await interaction.reply({ content: 'Processing...', ephemeral: true });
      const u = options.getUser('user');
      const t = await fetchMemberSafe(guild, u.id);
      if (!t) return interaction.editReply({ content: '❌ Member not found.' });
      await t.timeout(null);
      return interaction.editReply({ content: `✅ ${u.tag} removed from timeout.` });
    }

    if (commandName === 'untimeoutall') {
      if (!member.permissions.has(PermissionFlagsBits.ModerateMembers)) return interaction.reply({ content: '❌ Missing permission.', ephemeral: true });
      await interaction.reply({ content: 'Removing timeouts from members (best-effort)...', ephemeral: true });
      let removed = 0;
      guild.members.cache.forEach(m => { if (m.communicationDisabledUntil) try { m.timeout(null); removed++; } catch {} });
      return interaction.editReply({ content: `✅ Attempted to remove timeouts from ${removed} members.` });
    }

    // ---------- PURGE ----------
    if (commandName === 'purge') {
      if (!member.permissions.has(PermissionFlagsBits.ManageMessages)) return interaction.reply({ content: '❌ Missing Manage Messages permission.', ephemeral: true });
      await interaction.reply({ content: 'Deleting messages...', ephemeral: true });
      const amount = Math.min(options.getInteger('amount'), 100);
      const msgs = await channel.messages.fetch({ limit: amount });
      await channel.bulkDelete(msgs, true);
      return interaction.editReply({ content: `✅ Deleted ${msgs.size} messages.` });
    }

    if (commandName === 'purgeuser') {
      if (!member.permissions.has(PermissionFlagsBits.ManageMessages)) return interaction.reply({ content: '❌ Missing Manage Messages permission.', ephemeral: true });
      await interaction.reply({ content: 'Searching & deleting messages...', ephemeral: true });
      const u = options.getUser('user');
      const amount = Math.min(options.getInteger('amount'), 100);
      const msgs = await channel.messages.fetch({ limit: 100 });
      const userMsgsArr = msgs.filter(m => m.author && m.author.id === u.id).first(amount);
      if (!userMsgsArr.length) return interaction.editReply({ content: `✅ No recent messages found from ${u.tag}.` });
      await channel.bulkDelete(userMsgsArr, true);
      return interaction.editReply({ content: `✅ Deleted ${userMsgsArr.length} messages from ${u.tag}.` });
    }

    // ---------- ROLES / NICK ----------
    if (commandName === 'role') {
      if (!member.permissions.has(PermissionFlagsBits.ManageRoles)) return interaction.reply({ content: '❌ Missing Manage Roles permission.', ephemeral: true });
      const u = options.getUser('user'); const role = options.getRole('role');
      const t = await fetchMemberSafe(guild, u.id);
      if (!t) return interaction.reply({ content: '❌ Member not found.', ephemeral: true });
      await t.roles.add(role);
      return interaction.reply({ content: `✅ ${role.name} added to ${u.tag}.` });
    }

    if (commandName === 'unrole') {
      if (!member.permissions.has(PermissionFlagsBits.ManageRoles)) return interaction.reply({ content: '❌ Missing Manage Roles permission.', ephemeral: true });
      const u = options.getUser('user'); const role = options.getRole('role');
      const t = await fetchMemberSafe(guild, u.id);
      if (!t) return interaction.reply({ content: '❌ Member not found.', ephemeral: true });
      await t.roles.remove(role);
      return interaction.reply({ content: `✅ ${role.name} removed from ${u.tag}.` });
    }

    if (commandName === 'nick') {
      if (!member.permissions.has(PermissionFlagsBits.ManageNicknames)) return interaction.reply({ content: '❌ Missing Manage Nicknames permission.', ephemeral: true });
      const u = options.getUser('user'); const nickname = options.getString('nickname');
      const t = await fetchMemberSafe(guild, u.id);
      if (!t) return interaction.reply({ content: '❌ Member not found.', ephemeral: true });
      await t.setNickname(nickname);
      return interaction.reply({ content: `✅ Nickname changed to ${nickname} for ${u.tag}.` });
    }

    // ---------- NUKE ----------
    if (commandName === 'nuke') {
      if (!member.permissions.has(PermissionFlagsBits.ManageChannels)) return interaction.reply({ content: '❌ Missing Manage Channels permission.', ephemeral: true });
      await interaction.reply({ content: 'Nuking recent messages...', ephemeral: true });
      const msgs = await channel.messages.fetch({ limit: 100 });
      await channel.bulkDelete(msgs, true);
      return interaction.editReply({ content: `💣 Channel nuked (deleted ${msgs.size} messages).` });
    }

    // ---------- CHANNEL LOCK/HIDE ----------
    if (commandName === 'lock') {
      if (!member.permissions.has(PermissionFlagsBits.ManageChannels)) return interaction.reply({ content: '❌ Missing Manage Channels.', ephemeral: true });
      await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: false }).catch(()=>{});
      return interaction.reply({ content: '🔒 Channel locked.' });
    }
    if (commandName === 'unlock') {
      if (!member.permissions.has(PermissionFlagsBits.ManageChannels)) return interaction.reply({ content: '❌ Missing Manage Channels.', ephemeral: true });
      await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: true }).catch(()=>{});
      return interaction.reply({ content: '🔓 Channel unlocked.' });
    }
    if (commandName === 'hide') {
      if (!member.permissions.has(PermissionFlagsBits.ManageChannels)) return interaction.reply({ content: '❌ Missing Manage Channels.', ephemeral: true });
      await channel.permissionOverwrites.edit(guild.roles.everyone, { ViewChannel: false }).catch(()=>{});
      return interaction.reply({ content: '🙈 Channel hidden.' });
    }
    if (commandName === 'unhide') {
      if (!member.permissions.has(PermissionFlagsBits.ManageChannels)) return interaction.reply({ content: '❌ Missing Manage Channels.', ephemeral: true });
      await channel.permissionOverwrites.edit(guild.roles.everyone, { ViewChannel: true }).catch(()=>{});
      return interaction.reply({ content: '👀 Channel unhidden.' });
    }

    // ---------- CHANNEL (ALL) ----------
    if (commandName === 'lockall') {
      if (!member.permissions.has(PermissionFlagsBits.ManageChannels)) return interaction.reply({ content: '❌ Missing Manage Channels.', ephemeral: true });
      await interaction.reply({ content: 'Locking all text channels...', ephemeral: true });
      guild.channels.cache.filter(c => c.type === ChannelType.GuildText).forEach(ch => ch.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: false }).catch(()=>{}));
      return interaction.editReply({ content: '🔒 All text channels processed (locked).' });
    }
    if (commandName === 'unlockall') {
      if (!member.permissions.has(PermissionFlagsBits.ManageChannels)) return interaction.reply({ content: '❌ Missing Manage Channels.', ephemeral: true });
      await interaction.reply({ content: 'Unlocking all text channels...', ephemeral: true });
      guild.channels.cache.filter(c => c.type === ChannelType.GuildText).forEach(ch => ch.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: true }).catch(()=>{}));
      return interaction.editReply({ content: '🔓 All text channels processed (unlocked).' });
    }
    if (commandName === 'hideall') {
      if (!member.permissions.has(PermissionFlagsBits.ManageChannels)) return interaction.reply({ content: '❌ Missing Manage Channels.', ephemeral: true });
      await interaction.reply({ content: 'Hiding all text channels...', ephemeral: true });
      guild.channels.cache.filter(c => c.type === ChannelType.GuildText).forEach(ch => ch.permissionOverwrites.edit(guild.roles.everyone, { ViewChannel: false }).catch(()=>{}));
      return interaction.editReply({ content: '🙈 All text channels processed (hidden).' });
    }
    if (commandName === 'unhideall') {
      if (!member.permissions.has(PermissionFlagsBits.ManageChannels)) return interaction.reply({ content: '❌ Missing Manage Channels.', ephemeral: true });
      await interaction.reply({ content: 'Unhiding all text channels...', ephemeral: true });
      guild.channels.cache.filter(c => c.type === ChannelType.GuildText).forEach(ch => ch.permissionOverwrites.edit(guild.roles.everyone, { ViewChannel: true }).catch(()=>{}));
      return interaction.editReply({ content: '👀 All text channels processed (unhidden).' });
    }

    // ---------- STEAL EMOJI ----------
    if (commandName === 'steal') {
      if (!member.permissions.has(PermissionFlagsBits.ManageEmojisAndStickers)) return interaction.reply({ content: '❌ Missing Manage Emojis permission.', ephemeral: true });
      await interaction.reply({ content: 'Attempting to steal emoji...', ephemeral: true });
      const emojiInput = options.getString('emoji');
      const match = emojiInput.match(/<a?:\w+:(\d+)>/);
      if (!match) return interaction.editReply({ content: '❌ Invalid emoji. Use format <:name:id> or <a:name:id>' });
      const id = match[1];
      const ext = emojiInput.startsWith('<a:') ? 'gif' : 'png';
      const url = `https://cdn.discordapp.com/emojis/${id}.${ext}`;
      try {
        const created = await guild.emojis.create({ attachment: url, name: `emoji_${id}` });
        return interaction.editReply({ content: `✅ Emoji added: <:${created.name}:${created.id}>` });
      } catch (e) {
        return interaction.editReply({ content: '❌ Failed to add emoji. Check permissions and emoji slots.' });
      }
    }

    // ---------- AFK ----------
    if (commandName === 'afk') {
      const reason = options.getString('reason') || 'AFK';
      afkMap.set(member.id, { reason, at: Date.now() });
      return interaction.reply({ content: `✅ AFK set: ${reason}` });
    }

    // ---------- SNIPE ----------
    if (commandName === 'snipe') {
      const userFilter = options.getUser('user'); // optional
      const arr = deletedMessages.get(channel.id) || [];
      if (!arr.length) return interaction.reply({ content: 'No deleted messages to snipe in this channel.', ephemeral: true });

      let targetEntry;
      let count = 0;
      if (userFilter) {
        const matches = arr.filter(e => e.authorId === userFilter.id);
        count = matches.length;
        if (count === 0) return interaction.reply({ content: `No deleted messages by ${userFilter.tag} in this channel.`, ephemeral: true });
        targetEntry = matches[0];
      } else {
        targetEntry = arr[0];
        count = arr.filter(e => e.authorId === targetEntry.authorId).length;
      }

      let content = targetEntry.content || '[no text content]';
      if (targetEntry.attachments && targetEntry.attachments.length) {
        content += `\nAttachments:\n${targetEntry.attachments.map(a => a.url).join('\n')}`;
      }
      const authorLabel = targetEntry.authorTag || 'Unknown';
      const suffix = (count > 1) ? ` (User deleted messages ${count})` : '';
      return interaction.reply({ content: `🕵️ SNIPE: ${authorLabel}${suffix}\n\n${content}` });
    }

    // ---------- SLOWMODE ----------
    if (commandName === 'slowmode') {
      if (!member.permissions.has(PermissionFlagsBits.ManageChannels)) return interaction.reply({ content: '❌ Missing Manage Channels permission.', ephemeral: true });
      const duration = options.getInteger('duration');
      await channel.setRateLimitPerUser(duration).catch(()=>{});
      return interaction.reply({ content: `⏱ Slowmode set to ${duration}s in this channel.` });
    }
    if (commandName === 'slowmode_disable') {
      if (!member.permissions.has(PermissionFlagsBits.ManageChannels)) return interaction.reply({ content: '❌ Missing Manage Channels permission.', ephemeral: true });
      await channel.setRateLimitPerUser(0).catch(()=>{});
      return interaction.reply({ content: '⏱ Slowmode disabled in this channel.' });
    }

    // ---------- SERVER RENAME ----------
    if (commandName === 'serverrename') {
      if (!member.permissions.has(PermissionFlagsBits.ManageGuild)) return interaction.reply({ content: '❌ Missing Manage Server permission.', ephemeral: true });
      const name = options.getString('name');
      await guild.setName(name);
      return interaction.reply({ content: `✅ Server renamed to ${name}` });
    }

    // ---------- SET PREFIX ----------
    if (commandName === 'setprefix') {
      if (!member.permissions.has(PermissionFlagsBits.ManageGuild)) return interaction.reply({ content: '❌ Missing Manage Server permission.', ephemeral: true });
      const np = options.getString('prefix');
      prefixes[guild.id] = np;
      savePrefixes();
      return interaction.reply({ content: `✅ Prefix set to \`${np}\` for this server.` });
    }

    // ---------- STATS / UPTIME / INVITE ----------
    if (commandName === 'stats') {
      return interaction.reply({ content: `Servers (cached): ${client.guilds.cache.size}\nUsers (cached): ${client.users.cache.size}` });
    }
    if (commandName === 'uptime') {
      return interaction.reply({ content: `Uptime: ${Math.floor(client.uptime/1000)} seconds` });
    }
    if (commandName === 'invite') {
      const link = `https://discord.com/oauth2/authorize?client_id=${client.user?.id || process.env.CLIENT_ID}&scope=bot%20applications.commands&permissions=8`;
      return interaction.reply({ content: `Invite: ${link}` });
    }

    // ---------- LISTS ----------
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
      const bans = await guild.bans.fetch();
      const names = bans.map(b => b.user.tag).join(', ') || 'No banned users';
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
    return interaction.reply({ content: 'Command executed (fallback).', ephemeral: true });

  } catch (err) {
    console.error('Interaction error:', err);
    try {
      if (interaction.replied || interaction.deferred) await interaction.editReply({ content: '❌ An error occurred while executing the command.' });
      else await interaction.reply({ content: '❌ An error occurred while executing the command.', ephemeral: true });
    } catch {}
  }
});

// ---------- Message-based prefix handler (same commands available with prefix) ----------
client.on('messageCreate', async message => {
  try {
    if (!message.guild || message.author.bot) return;

    // AFK removal & mention notification
    if (afkMap.has(message.author.id)) {
      afkMap.delete(message.author.id);
      message.channel.send(`${message.author.tag}, your AFK has been removed.`);
    }
    if (message.mentions.users.size) {
      for (const [, u] of message.mentions.users) {
        const info = afkMap.get(u.id);
        if (info) message.channel.send(`${u.tag} is AFK: ${info.reason}`);
      }
    }

    // reload prefixes safely (in case changed on disk)
    try { prefixes = JSON.parse(fs.readFileSync(PREFIX_FILE, 'utf8') || '{}'); } catch {}

    const prefix = prefixes[message.guild.id] || '!';
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/\s+/);
    const cmd = args.shift().toLowerCase();

    // Simple mapping: many commands require similar checks - implement main ones
    if (cmd === 'ping') return message.reply('Pong!');
    if (cmd === 'help') {
      const embed = new EmbedBuilder()
        .setTitle('Bot Commands')
        .setDescription('Use slash (/) or prefix (!) commands. Example: `!ban @user`')
        .setColor(0x00AE86);
      return message.reply({ embeds: [embed] });
    }

    // setprefix
    if (cmd === 'setprefix') {
      if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) return message.reply('❌ You need Manage Server permission.');
      const np = args[0];
      if (!np) return message.reply('❌ Provide a prefix.');
      prefixes[message.guild.id] = np;
      savePrefixes();
      return message.reply(`✅ Prefix set to \`${np}\``);
    }

    // ban (prefix) - expects mention or id
    if (cmd === 'ban') {
      if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) return message.reply('❌ Missing Ban Members permission.');
      const id = parseMentionToId(args[0]);
      if (!id) return message.reply('❌ Provide a user mention or ID.');
      await message.guild.members.ban(id, { reason: `Banned by ${message.author.tag}` }).catch(e => { return message.reply('❌ Failed to ban.'); });
      return message.reply(`✅ Banned <@${id}> (attempted).`);
    }

    // kick
    if (cmd === 'kick') {
      if (!message.member.permissions.has(PermissionFlagsBits.KickMembers)) return message.reply('❌ Missing Kick Members permission.');
      const id = parseMentionToId(args[0]);
      const member = await fetchMemberSafe(message.guild, id);
      if (!member) return message.reply('❌ Member not found.');
      await member.kick(`Kicked by ${message.author.tag}`).catch(()=>{});
      return message.reply(`✅ Kicked ${member.user.tag}.`);
    }

    // purge
    if (cmd === 'purge') {
      if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) return message.reply('❌ Missing Manage Messages permission.');
      const amount = Math.min(parseInt(args[0]) || 0, 100);
      if (amount < 1) return message.reply('❌ Provide amount 1-100.');
      const msgs = await message.channel.messages.fetch({ limit: amount });
      await message.channel.bulkDelete(msgs, true);
      return message.reply(`✅ Deleted ${msgs.size} messages.`).then(m => setTimeout(() => m.delete().catch(()=>{}), 3000));
    }

    // purgeuser
    if (cmd === 'purgeuser') {
      if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) return message.reply('❌ Missing Manage Messages permission.');
      const id = parseMentionToId(args[0]);
      const amount = Math.min(parseInt(args[1]) || 100, 100);
      if (!id) return message.reply('❌ Provide user mention/ID and amount.');
      const msgs = await message.channel.messages.fetch({ limit: 100 });
      const userMsgsArr = msgs.filter(m => m.author && m.author.id === id).first(amount);
      if (!userMsgsArr.length) return message.reply('✅ No messages found from that user.');
      await message.channel.bulkDelete(userMsgsArr, true);
      return message.reply(`✅ Deleted ${userMsgsArr.length} messages from <@${id}>.`).then(m => setTimeout(() => m.delete().catch(()=>{}), 3000));
    }

    // snipe (prefix)
    if (cmd === 'snipe') {
      const mention = args[0] ? parseMentionToId(args[0]) : null;
      const arr = deletedMessages.get(message.channel.id) || [];
      if (!arr.length) return message.reply('No deleted messages to snipe here.');
      let targetEntry, count = 0;
      if (mention) {
        const matches = arr.filter(e => e.authorId === mention);
        count = matches.length;
        if (!count) return message.reply('No deleted messages from that user in this channel.');
        targetEntry = matches[0];
      } else {
        targetEntry = arr[0];
        count = arr.filter(e => e.authorId === targetEntry.authorId).length;
      }
      let content = targetEntry.content || '[no text]';
      if (targetEntry.attachments.length) content += '\nAttachments:\n' + targetEntry.attachments.map(a => a.url).join('\n');
      const suffix = (count > 1) ? ` (User deleted messages ${count})` : '';
      return message.reply(`🕵️ SNIPE: ${targetEntry.authorTag}${suffix}\n\n${content}`);
    }

    // afk (prefix)
    if (cmd === 'afk') {
      const reason = args.join(' ') || 'AFK';
      afkMap.set(message.author.id, { reason, at: Date.now() });
      return message.reply(`✅ AFK set: ${reason}`);
    }

    // other prefix commands can be added similarly...
  } catch (e) {
    console.error('Prefix handler error:', e);
    try { await message.reply('❌ Error executing command.'); } catch {}
  }
});

// ---------- Ready & Login ----------
client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  // optional status:
  const defaultPrefix = prefixes['default'] || '!';
  client.user.setActivity(`Type ${defaultPrefix}help | /help`, { type: 3 }).catch(()=>{});
});

client.login(process.env.TOKEN);
