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

// ----------------- DEFINE COMMANDS -----------------
const commands = [
  // Single-user commands
  new SlashCommandBuilder().setName('ping').setDescription('Replies with Pong!'),
  new SlashCommandBuilder().setName('ban').setDescription('Ban a member')
    .addUserOption(option => option.setName('user').setDescription('User to ban').setRequired(true)),
  new SlashCommandBuilder().setName('unban').setDescription('Unban a member')
    .addUserOption(option => option.setName('user').setDescription('User to unban').setRequired(true)),
  new SlashCommandBuilder().setName('kick').setDescription('Kick a member')
    .addUserOption(option => option.setName('user').setDescription('User to kick').setRequired(true)),
  new SlashCommandBuilder().setName('timeout').setDescription('Timeout a member (seconds)')
    .addUserOption(option => option.setName('user').setDescription('User to timeout').setRequired(true))
    .addIntegerOption(option => option.setName('duration').setDescription('Duration in seconds').setRequired(true)),
  new SlashCommandBuilder().setName('untimeout').setDescription('Remove timeout from a member')
    .addUserOption(option => option.setName('user').setDescription('User to untimeout').setRequired(true)),
  new SlashCommandBuilder().setName('role').setDescription('Add role to a member')
    .addUserOption(option => option.setName('user').setDescription('User').setRequired(true))
    .addRoleOption(option => option.setName('role').setDescription('Role to give').setRequired(true)),
  new SlashCommandBuilder().setName('unrole').setDescription('Remove role from a member')
    .addUserOption(option => option.setName('user').setDescription('User').setRequired(true))
    .addRoleOption(option => option.setName('role').setDescription('Role to remove').setRequired(true)),
  new SlashCommandBuilder().setName('purge').setDescription('Delete a number of messages')
    .addIntegerOption(option => option.setName('amount').setDescription('Number of messages').setRequired(true)),
  new SlashCommandBuilder().setName('nick').setDescription('Change nickname')
    .addUserOption(option => option.setName('user').setDescription('User').setRequired(true))
    .addStringOption(option => option.setName('nickname').setDescription('New nickname').setRequired(true)),
  new SlashCommandBuilder().setName('nuke').setDescription('Delete all messages in the channel'),

  // Bulk commands
  new SlashCommandBuilder().setName('roleall').setDescription('Give a role to all members')
    .addRoleOption(option => option.setName('role').setDescription('Role to give').setRequired(true)),
  new SlashCommandBuilder().setName('unroleall').setDescription('Remove a role from all members')
    .addRoleOption(option => option.setName('role').setDescription('Role to remove').setRequired(true)),
  new SlashCommandBuilder().setName('lockall').setDescription('Lock all text channels'),
  new SlashCommandBuilder().setName('unlockall').setDescription('Unlock all text channels'),
  new SlashCommandBuilder().setName('hideall').setDescription('Hide all channels'),
  new SlashCommandBuilder().setName('unhideall').setDescription('Unhide all channels'),
  new SlashCommandBuilder().setName('untimeoutall').setDescription('Remove timeout from all members'),
  new SlashCommandBuilder().setName('unbanall').setDescription('Unban all banned users')
].map(command => command.toJSON());

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
  } catch (error) {
    console.error(error);
  }
})();

// ----------------- BOT EVENTS -----------------
client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;
  const { commandName, options, member, guild } = interaction;

  try {
    // ---------- PING ----------
    if (commandName === 'ping') return interaction.reply('Pong!');

    // ---------- SINGLE MEMBER COMMANDS ----------
    if (commandName === 'ban') {
      if (!member.permissions.has(PermissionFlagsBits.BanMembers))
        return interaction.reply('❌ You do not have permission to ban members.');
      const user = options.getUser('user');
      const target = guild.members.cache.get(user.id);
      if (!target) return interaction.reply('User not found.');
      await target.ban({ reason: `Banned by ${member.user.tag}` });
      return interaction.reply(`✅ ${user.tag} has been banned.`);
    }

    if (commandName === 'unban') {
      if (!member.permissions.has(PermissionFlagsBits.BanMembers))
        return interaction.reply('❌ You do not have permission to unban members.');
      const user = options.getUser('user');
      await guild.bans.remove(user.id);
      return interaction.reply(`✅ ${user.tag} has been unbanned.`);
    }

    if (commandName === 'kick') {
      if (!member.permissions.has(PermissionFlagsBits.KickMembers))
        return interaction.reply('❌ You do not have permission to kick members.');
      const user = options.getUser('user');
      const target = guild.members.cache.get(user.id);
      if (!target) return interaction.reply('User not found.');
      await target.kick(`Kicked by ${member.user.tag}`);
      return interaction.reply(`✅ ${user.tag} has been kicked.`);
    }

    if (commandName === 'timeout') {
      if (!member.permissions.has(PermissionFlagsBits.ModerateMembers))
        return interaction.reply('❌ You do not have permission to timeout members.');
      const user = options.getUser('user');
      const duration = options.getInteger('duration') * 1000;
      const target = guild.members.cache.get(user.id);
      if (!target) return interaction.reply('User not found.');
      await target.timeout(duration, `Timed out by ${member.user.tag}`);
      return interaction.reply(`✅ ${user.tag} timed out for ${options.getInteger('duration')} seconds.`);
    }

    if (commandName === 'untimeout') {
      if (!member.permissions.has(PermissionFlagsBits.ModerateMembers))
        return interaction.reply('❌ You do not have permission to remove timeout.');
      const user = options.getUser('user');
      const target = guild.members.cache.get(user.id);
      if (!target) return interaction.reply('User not found.');
      await target.timeout(null);
      return interaction.reply(`✅ ${user.tag} is no longer timed out.`);
    }

    if (commandName === 'role') {
      if (!member.permissions.has(PermissionFlagsBits.ManageRoles))
        return interaction.reply('❌ You do not have permission to manage roles.');
      const user = options.getUser('user');
      const role = options.getRole('role');
      const target = guild.members.cache.get(user.id);
      await target.roles.add(role);
      return interaction.reply(`✅ ${user.tag} has been given the role ${role.name}.`);
    }

    if (commandName === 'unrole') {
      if (!member.permissions.has(PermissionFlagsBits.ManageRoles))
        return interaction.reply('❌ You do not have permission to manage roles.');
      const user = options.getUser('user');
      const role = options.getRole('role');
      const target = guild.members.cache.get(user.id);
      await target.roles.remove(role);
      return interaction.reply(`✅ ${role.name} removed from ${user.tag}.`);
    }

    if (commandName === 'purge') {
      if (!member.permissions.has(PermissionFlagsBits.ManageMessages))
        return interaction.reply('❌ You do not have permission to purge messages.');
      const amount = options.getInteger('amount');
      await interaction.channel.bulkDelete(amount, true);
      return interaction.reply({ content: `✅ Deleted ${amount} messages.`, ephemeral: true });
    }

    if (commandName === 'nick') {
      if (!member.permissions.has(PermissionFlagsBits.ManageNicknames))
        return interaction.reply('❌ You do not have permission to change nicknames.');
      const user = options.getUser('user');
      const nickname = options.getString('nickname');
      const target = guild.members.cache.get(user.id);
      await target.setNickname(nickname);
      return interaction.reply(`✅ ${user.tag}'s nickname changed to ${nickname}.`);
    }

    if (commandName === 'nuke') {
      if (!member.permissions.has(PermissionFlagsBits.ManageChannels))
        return interaction.reply('❌ You do not have permission to nuke the channel.');
      const channel = interaction.channel;
      await channel.clone({ reason: `Nuked by ${member.user.tag}` });
      await channel.delete();
      return;
    }

    // ---------- BULK COMMANDS ----------
    if (commandName === 'roleall') {
      if (!member.permissions.has(PermissionFlagsBits.ManageRoles))
        return interaction.reply('❌ You do not have permission to manage roles.');
      const role = options.getRole('role');
      guild.members.cache.forEach(m => { if (!m.user.bot) m.roles.add(role).catch(() => {}); });
      return interaction.reply(`✅ Role ${role.name} given to all members.`);
    }

    if (commandName === 'unroleall') {
      if (!member.permissions.has(PermissionFlagsBits.ManageRoles))
        return interaction.reply('❌ You do not have permission to manage roles.');
      const role = options.getRole('role');
      guild.members.cache.forEach(m => { if (!m.user.bot) m.roles.remove(role).catch(() => {}); });
      return interaction.reply(`✅ Role ${role.name} removed from all members.`);
    }

    if (commandName === 'lockall') {
      if (!member.permissions.has(PermissionFlagsBits.ManageChannels))
        return interaction.reply('❌ You do not have permission to lock channels.');
      guild.channels.cache.forEach(ch => { if (ch.type === ChannelType.GuildText) ch.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: false }).catch(() => {}); });
      return interaction.reply('✅ All text channels locked.');
    }

    if (commandName === 'unlockall') {
      if (!member.permissions.has(PermissionFlagsBits.ManageChannels))
        return interaction.reply('❌ You do not have permission to unlock channels.');
      guild.channels.cache.forEach(ch => { if (ch.type === ChannelType.GuildText) ch.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: true }).catch(() => {}); });
      return interaction.reply('✅ All text channels unlocked.');
    }

    if (commandName === 'hideall') {
      if (!member.permissions.has(PermissionFlagsBits.ManageChannels))
        return interaction.reply('❌ You do not have permission to hide channels.');
      guild.channels.cache.forEach(ch => { ch.permissionOverwrites.edit(guild.roles.everyone, { ViewChannel: false }).catch(() => {}); });
      return interaction.reply('✅ All channels hidden.');
    }

    if (commandName === 'unhideall') {
      if (!member.permissions.has(PermissionFlagsBits.ManageChannels))
        return interaction.reply('❌ You do not have permission to unhide channels.');
      guild.channels.cache.forEach(ch => { ch.permissionOverwrites.edit(guild.roles.everyone, { ViewChannel: true }).catch(() => {}); });
      return interaction.reply('✅ All channels unhidden.');
    }

    if (commandName === 'untimeoutall') {
      if (!member.permissions.has(PermissionFlagsBits.ModerateMembers))
        return interaction.reply('❌ You do not have permission to remove timeout.');
      guild.members.cache.forEach(m => { if (!m.user.bot) m.timeout(null).catch(() => {}); });
      return interaction.reply('✅ Removed timeout from all members.');
    }

    if (commandName === 'unbanall') {
      if (!member.permissions.has(PermissionFlagsBits.BanMembers))
        return interaction.reply('❌ You do not have permission to unban members.');
      const bans = await guild.bans.fetch();
      bans.forEach(b => guild.bans.remove(b.user.id).catch(() => {}));
      return interaction.reply('✅ All banned users have been unbanned.');
    }

  } catch (err) {
    console.error(err);
    return interaction.reply({ content: '❌ An error occurred.', ephemeral: true });
  }
});

// ----------------- LOGIN -----------------
client.login(process.env.TOKEN);
