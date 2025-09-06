require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages] });

// Define your commands
const commands = [
  new SlashCommandBuilder().setName('ban').setDescription('Ban a member').addUserOption(option => option.setName('user').setDescription('User to ban').setRequired(true)),
  new SlashCommandBuilder().setName('unban').setDescription('Unban a member').addUserOption(option => option.setName('user').setDescription('User to unban').setRequired(true)),
  new SlashCommandBuilder().setName('unbanall').setDescription('Unban all members (admin only)'),
  new SlashCommandBuilder().setName('timeout').setDescription('Timeout a member').addUserOption(option => option.setName('user').setDescription('User to timeout').setRequired(true)),
  new SlashCommandBuilder().setName('untimeout').setDescription('Remove timeout from a member').addUserOption(option => option.setName('user').setDescription('User to untimeout').setRequired(true)),
  new SlashCommandBuilder().setName('untimeoutall').setDescription('Remove timeout from all members'),
  new SlashCommandBuilder().setName('kick').setDescription('Kick a member').addUserOption(option => option.setName('user').setDescription('User to kick').setRequired(true)),
  new SlashCommandBuilder().setName('role').setDescription('Add role to a member').addUserOption(option => option.setName('user').setDescription('User').setRequired(true)).addRoleOption(option => option.setName('role').setDescription('Role to give').setRequired(true)),
  new SlashCommandBuilder().setName('unrole').setDescription('Remove role from a member').addUserOption(option => option.setName('user').setDescription('User').setRequired(true)).addRoleOption(option => option.setName('role').setDescription('Role to remove').setRequired(true)),
  new SlashCommandBuilder().setName('roleall').setDescription('Give role to all members').addRoleOption(option => option.setName('role').setDescription('Role to give').setRequired(true)),
  new SlashCommandBuilder().setName('unroleall').setDescription('Remove role from all members').addRoleOption(option => option.setName('role').setDescription('Role to remove').setRequired(true)),
  new SlashCommandBuilder().setName('strip').setDescription('Remove all roles from a member').addUserOption(option => option.setName('user').setDescription('User').setRequired(true)),
  new SlashCommandBuilder().setName('purge').setDescription('Delete a number of messages').addIntegerOption(option => option.setName('amount').setDescription('Number of messages').setRequired(true)),
  new SlashCommandBuilder().setName('purgeuser').setDescription('Delete messages from a user').addUserOption(option => option.setName('user').setDescription('User').setRequired(true)),
  new SlashCommandBuilder().setName('lock').setDescription('Lock a channel'),
  new SlashCommandBuilder().setName('lockall').setDescription('Lock all channels'),
  new SlashCommandBuilder().setName('unlock').setDescription('Unlock a channel'),
  new SlashCommandBuilder().setName('unlockall').setDescription('Unlock all channels'),
  new SlashCommandBuilder().setName('hide').setDescription('Hide a channel'),
  new SlashCommandBuilder().setName('hideall').setDescription('Hide all channels'),
  new SlashCommandBuilder().setName('unhide').setDescription('Unhide a channel'),
  new SlashCommandBuilder().setName('unhideall').setDescription('Unhide all channels'),
  new SlashCommandBuilder().setName('nuke').setDescription('Delete all messages in a channel'),
  new SlashCommandBuilder().setName('nick').setDescription('Change nickname').addUserOption(option => option.setName('user').setDescription('User').setRequired(true)).addStringOption(option => option.setName('nickname').setDescription('New nickname').setRequired(true)),
].map(command => command.toJSON());

// Register commands (guild commands for fast testing)
const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log('Registering commands...');
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );
    console.log('✅ Commands registered!');
  } catch (error) {
    console.error(error);
  }
})();

// Event when bot is ready
client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

// Handle slash commands
client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  const { commandName, options } = interaction;

  // Example logic (fill in real code later)
  if (commandName === 'ping') {
    await interaction.reply('Pong!');
  } else if (commandName === 'ban') {
    const user = options.getUser('user');
    await interaction.reply(`Ban logic goes here for ${user.tag}`);
  } else {
    await interaction.reply({ content: `Command ${commandName} received! Logic not implemented yet.`, ephemeral: true });
  }
});

// Login
client.login(process.env.TOKEN);
