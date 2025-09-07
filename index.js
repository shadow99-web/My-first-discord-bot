// index.js - Full bot (no translate), ready for Render 24/7
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
  ChannelType 
} = require('discord.js');

// ===== EXPRESS KEEP-ALIVE =====
const app = express();
app.get("/", (req, res) => res.send("✅ Bot is alive on Render!"));
app.listen(3000, () => console.log("🌍 Keep-alive running on port 3000"));
// --------- Bot setup ----------
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});
// ===== PREFIX SYSTEM =====
const prefixesFile = "./prefixes.json";
let prefixes = {};
if (fs.existsSync(prefixesFile)) {
  prefixes = JSON.parse(fs.readFileSync(prefixesFile, "utf8"));
}

client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.guild) return;

  const guildPrefix = prefixes[message.guild.id] || "!";
  if (!message.content.startsWith(guildPrefix)) return;

  const args = message.content.slice(guildPrefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  if (command === "setprefix") {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply("❌ You don’t have permission to change prefix.");
    }
    const newPrefix = args[0];
    if (!newPrefix) return message.reply("❌ Please provide a new prefix.");
    prefixes[message.guild.id] = newPrefix;
    fs.writeFileSync(prefixesFile, JSON.stringify(prefixes, null, 2));
    return message.reply(`✅ Prefix updated to \`${newPrefix}\``);
  }

// --------- Persistence: prefixes ----------
const PREFIX_FILE = './prefixes.json';
if (!fs.existsSync(PREFIX_FILE)) fs.writeFileSync(PREFIX_FILE, '{}');
let prefixes = JSON.parse(fs.readFileSync(PREFIX_FILE, 'utf8'));

// helper: save prefixes
function savePrefixes() {
  fs.writeFileSync(PREFIX_FILE, JSON.stringify(prefixes, null, 2));
}

// --------- Snipe storage (per channel) ----------
const SNIPES_PER_CHANNEL = 50;
const deletedMessages = new Map(); // channelId -> Array of { authorId, authorTag, content, attachments[], timestamp }

// store deleted messages
client.on('messageDelete', (message) => {
  if (!message.guild) return;
  const arr = deletedMessages.get(message.channel.id) || [];
  arr.unshift({
    authorId: message.author?.id || null,
    authorTag: message.author?.tag || 'Unknown',
    content: message.content || '',
    attachments: message.attachments?.map(a => ({ url: a.url, name: a.name })) || [],
    timestamp: Date.now()
  });
  // keep size limited
  if (arr.length > SNIPES_PER_CHANNEL) arr.length = SNIPES_PER_CHANNEL;
  deletedMessages.set(message.channel.id, arr);
});

// --------- Define slash commands (all commands except translate) ----------
const commands = [
  // Basic
  new SlashCommandBuilder().setName('ping').setDescription('Replies with Pong!'),
  new SlashCommandBuilder().setName('serverinfo').setDescription('Server information'),
  new SlashCommandBuilder().setName('userinfo').setDescription('Get user info')
    .addUserOption(o => o.setName('user').setDescription('User').setRequired(true)),
  new SlashCommandBuilder().setName('membercount').setDescription('Show member count'),
  new SlashCommandBuilder().setName('boostcount').setDescription('Show boosts'),

  // Moderation
  new SlashCommandBuilder().setName('ban').setDescription('Ban a member')
    .addUserOption(o => o.setName('user').setDescription('Member to ban').setRequired(true)),
  new SlashCommandBuilder().setName('unban').setDescription('Unban a member')
    .addUserOption(o => o.setName('user').setDescription('User to unban (id)').setRequired(true)),
  new SlashCommandBuilder().setName('unbanall').setDescription('Unban all banned users (careful!)'),
  new SlashCommandBuilder().setName('kick').setDescription('Kick a member')
    .addUserOption(o => o.setName('user').setDescription('Member to kick').setRequired(true)),
  new SlashCommandBuilder().setName('timeout').setDescription('Timeout a member (seconds)')
    .addUserOption(o => o.setName('user').setDescription('Member to timeout').setRequired(true))
    .addIntegerOption(o => o.setName('duration').setDescription('Duration in seconds').setRequired(true)),
  new SlashCommandBuilder().setName('untimeout').setDescription('Remove timeout from a member')
    .addUserOption(o => o.setName('user').setDescription('Member').setRequired(true)),
  new SlashCommandBuilder().setName('untimeoutall').setDescription('Remove timeouts from all members'),

  // Purge
  new SlashCommandBuilder().setName('purge').setDescription('Bulk delete messages')
    .addIntegerOption(o => o.setName('amount').setDescription('Number of messages').setRequired(true)),
  new SlashCommandBuilder().setName('purgeuser').setDescription('Delete messages from a user')
    .addUserOption(o => o.setName('user').setDescription('User').setRequired(true))
    .addIntegerOption(o => o.setName('amount').setDescription('Max to scan (<=100)').setRequired(true)),

  // Roles
  new SlashCommandBuilder().setName('role').setDescription('Add role to a member')
    .addUserOption(o => o.setName('user').setDescription('Member').setRequired(true))
    .addRoleOption(o => o.setName('role').setDescription('Role').setRequired(true)),
  new SlashCommandBuilder().setName('unrole').setDescription('Remove role from a member')
    .addUserOption(o => o.setName('user').setDescription('Member').setRequired(true))
    .addRoleOption(o => o.setName('role').setDescription('Role').setRequired(true)),

  // Nick & nuke
  new SlashCommandBuilder().setName('nick').setDescription('Change a member nickname')
    .addUserOption(o => o.setName('user').setDescription('Member').setRequired(true))
    .addStringOption(o => o.setName('nickname').setDescription('New nickname').setRequired(true)),
  new SlashCommandBuilder().setName('nuke').setDescription('Nuke the current channel (delete recent messages)'),

  // Channel ops
  new SlashCommandBuilder().setName('lock').setDescription('Lock this channel'),
  new SlashCommandBuilder().setName('unlock').setDescription('Unlock this channel'),
  new SlashCommandBuilder().setName('hide').setDescription('Hide this channel (everyone)'),
  new SlashCommandBuilder().setName('unhide').setDescription('Unhide this channel (everyone)'),
  new SlashCommandBuilder().setName('lockall').setDescription('Lock all text channels'),
  new SlashCommandBuilder().setName('unlockall').setDescription('Unlock all text channels'),
  new SlashCommandBuilder().setName('hideall').setDescription('Hide all channels'),
  new SlashCommandBuilder().setName('unhideall').setDescription('Unhide all channels'),

  // Utility
  new SlashCommandBuilder().setName('steal').setDescription('Steal an emoji (paste <:name:id>)')
    .addStringOption(o => o.setName('emoji').setDescription('Emoji to steal').setRequired(true)),
  new SlashCommandBuilder().setName('afk').setDescription('Set AFK message')
    .addStringOption(o => o.setName('reason').setDescription('Reason')),
  new SlashCommandBuilder().setName('snipe').setDescription('Show last deleted message in this channel')
    .addUserOption(o => o.setName('user').setDescription('Filter by user (optional)')),
  new SlashCommandBuilder().setName('slowmode').setDescription('Set slowmode in this channel (seconds)')
    .addIntegerOption(o => o.setName('duration').setDescription('Seconds').setRequired(true)),
  new SlashCommandBuilder().setName('slowmode_disable').setDescription('Disable slowmode in this channel'),
  new SlashCommandBuilder().setName('serverrename').setDescription('Rename the server')
    .addStringOption(o => o.setName('name').setDescription('New server name').setRequired(true)),
  new SlashCommandBuilder().setName('setprefix').setDescription('Set custom message prefix for this guild')
    .addStringOption(o => o.setName('prefix').setDescription('New prefix').setRequired(true)),
  new SlashCommandBuilder().setName('stats').setDescription('Bot stats'),
  new SlashCommandBuilder().setName('uptime').setDescription('Bot uptime'),
  new SlashCommandBuilder().setName('invite').setDescription('Bot invite link'),

  // Listings
  new SlashCommandBuilder().setName('list_roles').setDescription('List roles'),
  new SlashCommandBuilder().setName('list_boosters').setDescription('List boosters'),
  new SlashCommandBuilder().setName('list_bots').setDescription('List bots'),
  new SlashCommandBuilder().setName('list_banned').setDescription('List banned users'),
  new SlashCommandBuilder().setName('list_admins').setDescription('List admins'),
  new SlashCommandBuilder().setName('list_moderators').setDescription('List moderators'),
].map(c => c.toJSON());

// --------- Register commands: global + guild (if provided) ----------
const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
(async () => {
  try {
    console.log('Registering global commands...');
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
    console.log('✅ Global commands registered.');

    if (process.env.GUILD_ID) {
      await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), { body: commands });
      console.log('⚡ Guild commands registered (instant).');
    }
  } catch (err) {
    console.error('Error registering commands:', err);
  }
})();

// --------- AFK storage ----------
const afkMap = new Map();

// --------- Interaction handler ----------
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;
  const { commandName, options, member, guild, channel } = interaction;

  try {
    // ---------- BASIC ----------
    if (commandName === 'ping') return interaction.reply('Pong!');
    if (commandName === 'serverinfo') return interaction.reply(`Server: ${guild.name}\nMembers: ${guild.memberCount}`);
    if (commandName === 'userinfo') {
      const user = options.getUser('user');
      const mem = guild.members.cache.get(user.id) || await guild.members.fetch(user.id);
      return interaction.reply(`Username: ${user.tag}\nID: ${user.id}\nJoined: ${mem.joinedAt}`);
    }
    if (commandName === 'membercount') return interaction.reply(`Total members: ${guild.memberCount}`);
    if (commandName === 'boostcount') return interaction.reply(`Boosts: ${guild.premiumSubscriptionCount}`);

    // ---------- MODERATION ----------
    if (commandName === 'ban') {
      if (!member.permissions.has(PermissionFlagsBits.BanMembers)) return interaction.reply({ content: '❌ You need Ban Members permission.', ephemeral: true });
      await interaction.reply({ content: 'Processing ban...', ephemeral: true });
      const user = options.getUser('user');
      await guild.members.ban(user.id, { reason: `Banned by ${member.user.tag}` });
      return interaction.editReply({ content: `✅ ${user.tag} was banned.` });
    }

    if (commandName === 'unban') {
      if (!member.permissions.has(PermissionFlagsBits.BanMembers)) return interaction.reply({ content: '❌ You need Ban Members permission.', ephemeral: true });
      await interaction.reply({ content: 'Processing unban...', ephemeral: true });
      const user = options.getUser('user');
      await guild.bans.remove(user.id);
      return interaction.editReply({ content: `✅ ${user.tag} was unbanned.` });
    }

    if (commandName === 'unbanall') {
      if (!member.permissions.has(PermissionFlagsBits.BanMembers)) return interaction.reply({ content: '❌ You need Ban Members permission.', ephemeral: true });
      await interaction.reply({ content: 'Processing unban all... This may take a while', ephemeral: true });
      const bans = await guild.bans.fetch();
      for (const [id] of bans) {
        try { await guild.bans.remove(id); } catch {}
      }
      return interaction.editReply({ content: `✅ Unbanned ${bans.size} users.` });
    }

    if (commandName === 'kick') {
      if (!member.permissions.has(PermissionFlagsBits.KickMembers)) return interaction.reply({ content: '❌ You need Kick Members permission.', ephemeral: true });
      await interaction.reply({ content: 'Processing kick...', ephemeral: true });
      const user = options.getUser('user');
      const target = guild.members.cache.get(user.id) || await guild.members.fetch(user.id);
      await target.kick(`Kicked by ${member.user.tag}`);
      return interaction.editReply({ content: `✅ ${user.tag} kicked.` });
    }

    if (commandName === 'timeout') {
      if (!member.permissions.has(PermissionFlagsBits.ModerateMembers)) return interaction.reply({ content: '❌ Missing Moderate Members permission.', ephemeral: true });
      await interaction.reply({ content: 'Processing timeout...', ephemeral: true });
      const user = options.getUser('user');
      const duration = options.getInteger('duration') * 1000;
      const target = guild.members.cache.get(user.id) || await guild.members.fetch(user.id);
      await target.timeout(duration, `Timed out by ${member.user.tag}`);
      return interaction.editReply({ content: `✅ ${user.tag} timed out for ${options.getInteger('duration')}s.` });
    }

    if (commandName === 'untimeout') {
      if (!member.permissions.has(PermissionFlagsBits.ModerateMembers)) return interaction.reply({ content: '❌ Missing permission.', ephemeral: true });
      await interaction.reply({ content: 'Processing...', ephemeral: true });
      const user = options.getUser('user');
      const target = guild.members.cache.get(user.id) || await guild.members.fetch(user.id);
      await target.timeout(null);
      return interaction.editReply({ content: `✅ ${user.tag} un-timeout.` });
    }

    if (commandName === 'untimeoutall') {
      if (!member.permissions.has(PermissionFlagsBits.ModerateMembers)) return interaction.reply({ content: '❌ Missing permission.', ephemeral: true });
      await interaction.reply({ content: 'Removing timeouts from members...', ephemeral: true });
      guild.members.cache.forEach(m => { if (m.communicationDisabledUntil) try { m.timeout(null); } catch{} });
      return interaction.editReply({ content: '✅ All timeouts removed where possible.' });
    }

    // ---------- PURGE ----------
    if (commandName === 'purge') {
      if (!member.permissions.has(PermissionFlagsBits.ManageMessages)) return interaction.reply({ content: '❌ Missing Manage Messages permission.', ephemeral: true });
      await interaction.reply({ content: 'Deleting messages...', ephemeral: true });
      const amount = options.getInteger('amount');
      const msgs = await channel.messages.fetch({ limit: Math.min(amount, 100) });
      await channel.bulkDelete(msgs, true);
      return interaction.editReply({ content: `✅ Deleted ${msgs.size} messages.` });
    }

    if (commandName === 'purgeuser') {
      if (!member.permissions.has(PermissionFlagsBits.ManageMessages)) return interaction.reply({ content: '❌ Missing Manage Messages permission.', ephemeral: true });
      await interaction.reply({ content: 'Searching and deleting messages...', ephemeral: true });
      const user = options.getUser('user');
      const amount = options.getInteger('amount');
      const msgs = await channel.messages.fetch({ limit: 100 });
      const userMsgs = msgs.filter(m => m.author && m.author.id === user.id).first(amount);
      await channel.bulkDelete(userMsgs, true);
      return interaction.editReply({ content: `✅ Deleted ${userMsgs.length} messages from ${user.tag}.` });
    }

    // ---------- ROLES ----------
    if (commandName === 'role') {
      if (!member.permissions.has(PermissionFlagsBits.ManageRoles)) return interaction.reply({ content: '❌ Missing Manage Roles permission.', ephemeral: true });
      const user = options.getUser('user'); const role = options.getRole('role');
      const target = guild.members.cache.get(user.id) || await guild.members.fetch(user.id);
      await target.roles.add(role);
      return interaction.reply({ content: `✅ Added ${role.name} to ${user.tag}.` });
    }

    if (commandName === 'unrole') {
      if (!member.permissions.has(PermissionFlagsBits.ManageRoles)) return interaction.reply({ content: '❌ Missing Manage Roles permission.', ephemeral: true });
      const user = options.getUser('user'); const role = options.getRole('role');
      const target = guild.members.cache.get(user.id) || await guild.members.fetch(user.id);
      await target.roles.remove(role);
      return interaction.reply({ content: `✅ Removed ${role.name} from ${user.tag}.` });
    }

    // ---------- NICK ----------
    if (commandName === 'nick') {
      if (!member.permissions.has(PermissionFlagsBits.ManageNicknames)) return interaction.reply({ content: '❌ Missing Manage Nicknames permission.', ephemeral: true });
      const user = options.getUser('user'); const nickname = options.getString('nickname');
      const target = guild.members.cache.get(user.id) || await guild.members.fetch(user.id);
      await target.setNickname(nickname);
      return interaction.reply({ content: `✅ Nickname changed to ${nickname} for ${user.tag}.` });
    }

    // ---------- NUKE ----------
    if (commandName === 'nuke') {
      if (!member.permissions.has(PermissionFlagsBits.ManageChannels)) return interaction.reply({ content: '❌ Missing Manage Channels permission.', ephemeral: true });
      await interaction.reply({ content: 'Nuking channel (deleting recent messages)...', ephemeral: true });
      const msgs = await channel.messages.fetch({ limit: 100 });
      await channel.bulkDelete(msgs, true);
      return interaction.editReply({ content: `💣 Channel nuked (deleted ${msgs.size} messages).` });
    }

    // ---------- CHANNEL LOCK/HIDE (single) ----------
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
      if (!member.permissions.has(PermissionFlagsBits.ManageChannels)) return interaction.reply({ content: '❌ Missing permission.', ephemeral: true });
      await channel.permissionOverwrites.edit(guild.roles.everyone, { ViewChannel: false }).catch(()=>{});
      return interaction.reply({ content: '🙈 Channel hidden.' });
    }
    if (commandName === 'unhide') {
      if (!member.permissions.has(PermissionFlagsBits.ManageChannels)) return interaction.reply({ content: '❌ Missing permission.', ephemeral: true });
      await channel.permissionOverwrites.edit(guild.roles.everyone, { ViewChannel: true }).catch(()=>{});
      return interaction.reply({ content: '👀 Channel unhidden.' });
    }

    // ---------- CHANNEL LOCK/HIDE (all) ----------
    if (commandName === 'lockall') {
      if (!member.permissions.has(PermissionFlagsBits.ManageChannels)) return interaction.reply({ content: '❌ Missing permission.', ephemeral: true });
      await interaction.reply({ content: 'Locking all channels (this may take a bit)...', ephemeral: true });
      guild.channels.cache.filter(c => c.type === ChannelType.GuildText).forEach(ch => {
        ch.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: false }).catch(()=>{});
      });
      return interaction.editReply({ content: '🔒 All channels processed (locked).' });
    }
    if (commandName === 'unlockall') {
      if (!member.permissions.has(PermissionFlagsBits.ManageChannels)) return interaction.reply({ content: '❌ Missing permission.', ephemeral: true });
      await interaction.reply({ content: 'Unlocking all channels...', ephemeral: true });
      guild.channels.cache.filter(c => c.type === ChannelType.GuildText).forEach(ch => {
        ch.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: true }).catch(()=>{});
      });
      return interaction.editReply({ content: '🔓 All channels processed (unlocked).' });
    }
    if (commandName === 'hideall') {
      if (!member.permissions.has(PermissionFlagsBits.ManageChannels)) return interaction.reply({ content: '❌ Missing permission.', ephemeral: true });
      await interaction.reply({ content: 'Hiding all channels...', ephemeral: true });
      guild.channels.cache.filter(c => c.type === ChannelType.GuildText).forEach(ch => {
        ch.permissionOverwrites.edit(guild.roles.everyone, { ViewChannel: false }).catch(()=>{});
      });
      return interaction.editReply({ content: '🙈 All channels processed (hidden).' });
    }
    if (commandName === 'unhideall') {
      if (!member.permissions.has(PermissionFlagsBits.ManageChannels)) return interaction.reply({ content: '❌ Missing permission.', ephemeral: true });
      await interaction.reply({ content: 'Unhiding all channels...', ephemeral: true });
      guild.channels.cache.filter(c => c.type === ChannelType.GuildText).forEach(ch => {
        ch.permissionOverwrites.edit(guild.roles.everyone, { ViewChannel: true }).catch(()=>{});
      });
      return interaction.editReply({ content: '👀 All channels processed (unhidden).' });
    }

    // ---------- STEAL EMOJI ----------
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
        // find messages in this channel by that user
        const matches = arr.filter(e => e.authorId === userFilter.id);
        count = matches.length;
        if (count === 0) return interaction.reply({ content: `No deleted messages by ${userFilter.tag} in this channel.`, ephemeral: true });
        targetEntry = matches[0]; // latest by that user
      } else {
        // last deleted overall
        targetEntry = arr[0];
        // count how many by same user at top
        count = arr.filter(e => e.authorId === targetEntry.authorId).length;
      }

      // build message
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
      const guildCount = client.guilds.cache.size;
      const userCount = client.users.cache.size;
      return interaction.reply({ content: `Servers: ${guildCount}\nUsers (cached): ${userCount}` });
    }
    if (commandName === 'uptime') {
      const up = Math.floor(client.uptime / 1000);
      return interaction.reply({ content: `Uptime: ${up} seconds` });
    }
    if (commandName === 'invite') {
      const link = `https://discord.com/oauth2/authorize?client_id=${client.user?.id || process.env.CLIENT_ID}&scope=bot%20applications.commands&permissions=8`;
      return interaction.reply({ content: `Invite: ${link}` });
    }

    // ---------- LISTINGS ----------
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

    // If command not matched
    return interaction.reply({ content: 'Unknown command (this should not happen).', ephemeral: true });
  } catch (err) {
    console.error('Error handling command:', err);
    if (interaction.replied || interaction.deferred) {
      try { await interaction.editReply({ content: '❌ An error occurred while executing the command.' }); } catch {}
    } else {
      try { await interaction.reply({ content: '❌ An error occurred while executing the command.', ephemeral: true }); } catch {}
    }
  }
});

// ---------- Message-based commands using custom prefix ----------
client.on('messageCreate', async (message) => {
  if (!message.guild || message.author.bot) return;
  // AFK auto-notify (simple)
  const afk = afkMap.get(message.author.id);
  if (afk) {
    afkMap.delete(message.author.id);
    message.channel.send(`${message.author.tag}, your AFK (${afk.reason}) has been removed.`);
  }
  // check mentions for AFK users
  if (message.mentions.users.size) {
    for (const [,u] of message.mentions.users) {
      const info = afkMap.get(u.id);
      if (info) {
        message.channel.send(`${u.tag} is AFK: ${info.reason}`);
      }
    }
  }

  const guildPrefix = prefixes[message.guild.id] || '!';
  if (!message.content.startsWith(guildPrefix)) return;
  const args = message.content.slice(guildPrefix.length).trim().split(/\s+/);
  const cmd = args.shift().toLowerCase();

  // example message command: ping
  if (cmd === 'ping') return message.channel.send('Pong!');

  // You can add more message-based commands here following the same pattern
});

// --------- Login ----------
client.login(process.env.TOKEN);
