const { Client, GatewayIntentBits, REST, Routes } = require("discord.js");
require("dotenv").config();

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Register slash commands
const commands = [
  {
    name: "ping",
    description: "Replies with Pong!",
  },
  {
    name: "avatar",
    description: "Shows your avatar!",
  },
];

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log("Started refreshing application (/) commands.");

    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands },
    );

    console.log("Successfully reloaded application (/) commands.");
  } catch (error) {
    console.error(error);
  }
})();

client.on("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on("interactionCreate", async interaction => {
  if (!interaction.isCommand()) return;

  if (interaction.commandName === "ping") {
    await interaction.reply("🏓 Pong!");
  } else if (interaction.commandName === "avatar") {
    await interaction.reply(interaction.user.displayAvatarURL());
  }
});

client.login(process.env.TOKEN);
