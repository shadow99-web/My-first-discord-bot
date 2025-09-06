require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// ----------------- COMMAND DEFINITIONS -----------------
const commands = [
  // Moderation / single member
  new SlashCommandBuilder().setName('ping').setDescription('Replies with Pong!'),
  new SlashCommandBuilder().setName('ban').setDescription('Ban a member')
    .addUserOption(o => o.setName('user').setDescription('User to ban').setRequired(true)),
  new SlashCommandBuilder().setName('unban').setDescription('Unban a member')
    .addUserOption(o => o.setName('user').setDescription('User to unban').setRequired(true)),
  new SlashCommandBuilder().setName('kick').setDescription('Kick a member')
    .addUserOption(o => o.setName('user').setDescription('User to kick').setRequired(true)),
  new SlashCommandBuilder().setName('timeout').setDescription('Timeout a member (seconds)')
    .addUserOption(o => o.setName('user').setDescription('User to timeout').setRequired(true))
    .addIntegerOption(o => o.setName('duration').setDescription('Duration in seconds').setRequired(true)),
  new SlashCommandBuilder().setName('untimeout').setDescription('Remove timeout from a member')
    .addUserOption(o => o.setName('user').setDescription('User to untimeout').setRequired(true)),
  new SlashCommandBuilder().setName('role').setDescription('Add role to a member')
    .addUserOption(o => o.setName('user').setDescription('User').setRequired(true))
    .addRoleOption(o => o.setName('role').setDescription('Role to give').setRequired(true)),
  new SlashCommandBuilder().setName('unrole').setDescription('Remove role from a member')
    .addUserOption(o => o.setName('user').setDescription('User').setRequired(true))
    .addRoleOption(o => o.setName('role').setDescription('Role to remove').setRequired(true)),
  new SlashCommandBuilder().setName('purge').setDescription('Delete a number of messages')
    .addIntegerOption(o => o.setName('amount').setDescription('Number of messages').setRequired(true)),
  new SlashCommandBuilder().setName('nick').setDescription('Change nickname')
    .addUserOption(o => o.setName('user').setDescription('User').setRequired(true))
    .addStringOption(o => o.setName('nickname').setDescription('New nickname').setRequired(true)),
  new SlashCommandBuilder().setName('nuke').setDescription('Delete all messages in the channel'),

  // Bulk
  new SlashCommandBuilder().setName('roleall').setDescription('Give a role to all members')
    .addRoleOption(o => o.setName('role').setDescription('Role to give').setRequired(true)),
  new SlashCommandBuilder().setName('unroleall').setDescription('Remove a role from all members')
    .addRoleOption(o => o.setName('role').setDescription('Role to remove').setRequired(true)),
  new SlashCommandBuilder().setName('lockall').setDescription('Lock all text channels'),
  new SlashCommandBuilder().setName('unlockall').setDescription('Unlock all text channels'),
  new SlashCommandBuilder().setName('hideall').setDescription('Hide all channels'),
  new SlashCommandBuilder().setName('unhideall').setDescription('Unhide all channels'),
  new SlashCommandBuilder().setName('untimeoutall').setDescription('Remove timeout from all members'),
  new SlashCommandBuilder().setName('unbanall').setDescription('Unban all banned users'),

  // Utility / info
  new SlashCommandBuilder().setName('teaminfo').setDescription('Show info about team'),
  new SlashCommandBuilder().setName('serverinfo').setDescription('Show server info'),
  new SlashCommandBuilder().setName('servericon').setDescription('Show server icon'),
  new SlashCommandBuilder().setName('serverbanner').setDescription('Show server banner'),
  new SlashCommandBuilder().setName('roleinfo').setDescription('Show role info')
    .addRoleOption(o => o.setName('role').setDescription('Role').setRequired(true)),
  new SlashCommandBuilder().setName('userinfo').setDescription('Show user info')
    .addUserOption(o => o.setName('user').setDescription('User').setRequired(true)),
  new SlashCommandBuilder().setName('membercount').setDescription('Show total members'),
  new SlashCommandBuilder().setName('boostcount').setDescription('Show server boosts'),
  new SlashCommandBuilder().setName('steal').setDescription('Steal an emoji')
    .addStringOption(o => o.setName('emoji').setDescription('Emoji to steal').setRequired(true)),
  new SlashCommandBuilder().setName('afk').setDescription('Set AFK status')
    .addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(false)),
  new SlashCommandBuilder().setName('translate').setDescription('Translate a message')
    .addStringOption(o => o.setName('text').setDescription('Text to translate').setRequired(true)),
  new SlashCommandBuilder().setName('slowmode').setDescription('Set slowmode')
    .addIntegerOption(o => o.setName('duration').setDescription('Seconds').setRequired(true)),
  new SlashCommandBuilder().setName('slowmode_disable').setDescription('Disable slowmode'),
  new SlashCommandBuilder().setName('serverrename').setDescription('Rename server')
    .addStringOption(o => o.setName('name').setDescription('New server name').setRequired(true)),
  new SlashCommandBuilder().setName('setprefix').setDescription('Set bot prefix')
    .addStringOption(o => o.setName('prefix').setDescription('New prefix').setRequired(true)),
  new SlashCommandBuilder().setName('stats').setDescription('Bot stats'),
  new SlashCommandBuilder().setName('uptime').setDescription('Bot uptime'),
  new SlashCommandBuilder().setName('invite').setDescription('Bot invite link'),

  // Listing
  new SlashCommandBuilder().setName('list_roles').setDescription('List all roles'),
  new SlashCommandBuilder().setName('list_boosters').setDescription('List all boosters'),
  new SlashCommandBuilder().setName('list_bots').setDescription('List all bots'),
  new SlashCommandBuilder().setName('list_banned').setDescription('List all banned users'),
  new SlashCommandBuilder().setName('list_admins').setDescription('List all admins'),
  new SlashCommandBuilder().setName('list_moderators').setDescription('List all moderators')
].map(c => c.toJSON());

// ----------------- REGISTER COMMANDS -----------------
const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
(async () => {
  try {
    console.log('Registering guild commands...');
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );
    console.log('✅ Commands registered!');
  } catch (err) {
    console.error(err);
  }
})();

// ----------------- BOT EVENTS -----------------
client.once('ready', () => console.log(`Logged in as ${client.user.tag}!`));

client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;
  const { commandName, options, member, guild } = interaction;

  try {
    // ----------------- MODERATION COMMANDS -----------------
    if (commandName === 'ping') return interaction.reply('Pong!');
    
    // --- Ban ---
    if (commandName === 'ban') {
      if (!member.permissions.has(PermissionFlagsBits.BanMembers)) return interaction.reply('❌ No permission.');
      const user = options.getUser('user');
      const target = guild.members.cache.get(user.id);
      if (!target) return interaction.reply('User not found.');
      await target.ban({ reason: `Banned by ${member.user.tag}` });
      return interaction.reply(`✅ ${user.tag} banned.`);
    }

    // --- Unban ---
    if (commandName === 'unban') {
      if (!member.permissions.has(PermissionFlagsBits.BanMembers)) return interaction.reply('❌ No permission.');
      const user = options.getUser('user');
      await guild.bans.remove(user.id);
      return interaction.reply(`✅ ${user.tag} unbanned.`);
    }

    // --- Kick ---
    if (commandName === 'kick') {
      if (!member.permissions.has(PermissionFlagsBits.KickMembers)) return interaction.reply('❌ No permission.');
      const user = options.getUser('user');
      const target = guild.members.cache.get(user.id);
      if (!target) return interaction.reply('User not found.');
      await target.kick(`Kicked by ${member.user.tag}`);
      return interaction.reply(`✅ ${user.tag} kicked.`);
    }

    // --- Timeout ---
    if (commandName === 'timeout') {
      if (!member.permissions.has(PermissionFlagsBits.ModerateMembers)) return interaction.reply('❌ No permission.');
      const user = options.getUser('user');
      const duration = options.getInteger('duration') * 1000;
      const target = guild.members.cache.get(user.id);
      if (!target) return interaction.reply('User not found.');
      await target.timeout(duration, `Timed out by ${member.user.tag}`);
      return interaction.reply(`✅ ${user.tag} timed out for ${options.getInteger('duration')}s.`);
    }

    // --- Untimeout ---
    if (commandName === 'untimeout') {
      if (!member.permissions.has(PermissionFlagsBits.ModerateMembers)) return interaction.reply('❌ No permission.');
      const user = options.getUser('user');
      const target = guild.members.cache.get(user.id);
      if (!target) return interaction.reply('User not found.');
      await target.timeout(null);
      return interaction.reply(`✅ ${user.tag} un-timed out.`);
    }

    // --- Role ---
    if (commandName === 'role') {
      if (!member.permissions.has(PermissionFlagsBits.ManageRoles)) return interaction.reply('❌ No permission.');
      const user = options.getUser('user');
      const role = options.getRole('role');
      const target = guild.members.cache.get(user.id);
      await target.roles.add(role);
      return interaction.reply(`✅ ${user.tag} given role ${role.name}.`);
    }

    // --- Unrole ---
    if (commandName === 'unrole') {
      if (!member.permissions.has(PermissionFlagsBits.ManageRoles)) return interaction.reply('❌ No permission.');
      const user = options.getUser('user');
      const role = options.getRole('role');
      const target = guild.members.cache.get(user.id);
      await target.roles.remove(role);
      return interaction.reply(`✅ ${role.name} removed from ${user.tag}.`);
    }

    // --- Purge ---
    if (commandName === 'purge') {
      if (!member.permissions.has(PermissionFlagsBits.ManageMessages)) return interaction.reply('❌ No permission.');
      const amount = options.getInteger('amount');
      await interaction.channel.bulkDelete(amount, true);
      return interaction.reply({ content: `✅ Deleted ${amount} messages.`, ephemeral: true });
    }

    // --- Nickname ---
    if (commandName === 'nick') {
      if (!member.permissions.has(PermissionFlagsBits.ManageNicknames)) return interaction.reply('❌ No permission.');
      const user = options.getUser('user');
      const nickname = options.getString('nickname');
      const target = guild.members.cache.get(user.id);
      await target.setNickname(nickname);
      return interaction.reply(`✅ ${user.tag} nickname changed to ${nickname}.`);
    }

    // --- Nuke ---
    if (commandName === 'nuke') {
      if (!member.permissions.has(PermissionFlagsBits.ManageChannels)) return interaction.reply('❌ No permission.');
      const channel = interaction.channel;
      await channel.clone({ reason: `Nuked by ${member.user.tag}` });
      await channel.delete();
      return;
    }

    // --- Steal Emoji ---
    if (commandName === 'steal') {
      if (!member.permissions.has(PermissionFlagsBits.ManageEmojisAndStickers)) return interaction.reply('❌ No permission.');
      const emojiInput = options.getString('emoji');
      const match = emojiInput.match(/<a?:\w+:(\d+)>/);
      if (!match) return interaction.reply('❌ Invalid emoji.');
      const emojiId = match[1];
      const targetEmoji = client.emojis.cache.get(emojiId);
      if (!targetEmoji) return interaction.reply('❌ Emoji not found.');
      try {
        const newEmoji = await guild.emojis.create({ attachment: targetEmoji.url, name: targetEmoji.name });
        return interaction.reply(`✅ Emoji ${newEmoji.name} added to this server!`);
      } catch {
        return interaction.reply('❌ Failed to add emoji. Check permissions and emoji slots.');
      }
    }

  } catch (err) {
    console.error(err);
    return interaction.reply('❌ Something went wrong.');
  }
});

client.login(process.env.TOKEN);
