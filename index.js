// ========== Dependencies ==========
const { Client, GatewayIntentBits, Partials, Collection, REST, Routes } = require("discord.js");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

// ========== Client Setup ==========
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

// ========== Prefix ==========
const PREFIX = "!"; // default prefix (you can extend with dynamic prefixes later)

// ========== Command Collections ==========
client.prefixCommands = new Collection();
const slashCommands = [];

// ========== Load Commands ==========
const commandFiles = fs.readdirSync(path.join(__dirname, "commands")).filter(file => file.endsWith(".js"));

for (const file of commandFiles) {
  const command = require(`./commands/${file}`);

  if (command.name) {
    client.prefixCommands.set(command.name, command);
  }

  if (command.slashData) {
    slashCommands.push(command.slashData.toJSON());
  }
}

console.log(`✅ Loaded ${commandFiles.length} commands.`);

// ========== Slash Command Register ==========
client.once("ready", async () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);

  const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

  try {
    console.log("🔄 Registering slash commands...");
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: slashCommands }
    );
    console.log("✅ Slash commands registered globally.");
  } catch (err) {
    console.error("❌ Failed to register slash commands:", err);
  }
});

// ========== Prefix Handler ==========
client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.guild) return;
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();
  const command = client.prefixCommands.get(commandName);

  if (command) {
    try {
      await command.executePrefix(message, args);
    } catch (err) {
      console.error(err);
      message.reply("❌ Error running that command.");
    }
  }
});

// ========== Slash Handler ==========
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.prefixCommands.get(interaction.commandName);
  if (command) {
    try {
      await command.executeSlash(interaction);
    } catch (err) {
      console.error(err);
      await interaction.reply({ content: "❌ Error running that command.", ephemeral: true });
    }
  }
});

// ========== Login ==========
client.login(process.env.TOKEN);
