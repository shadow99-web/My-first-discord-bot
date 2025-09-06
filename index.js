require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');

// Create client
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Define your commands
const commands = [
  new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with Pong!'),
  new SlashCommandBuilder()
    .setName('avatar')
    .setDescription('Shows your avatar')
].map(command => command.toJSON());

// Register guild commands
const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log('Registering guild commands...');
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), // Replace GUILD_ID in .env
      { body: commands }
    );
    console.log('✅ Guild commands registered!');
  } catch (error) {
    console.error(error);
  }
})();

// Event when bot is ready
client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

// Event to handle slash commands
client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  const { commandName } = interaction;

  if (commandName === 'ping') {
    await interaction.reply('Pong!');
  } else if (commandName === 'avatar') {
    await interaction.reply({ content: interaction.user.displayAvatarURL({ dynamic: true }) });
  }
});

// Login bot
client.login(process.env.TOKEN);
