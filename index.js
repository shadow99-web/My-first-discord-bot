require("dotenv").config();
const { Client, GatewayIntentBits, Partials, Collection } = require("discord.js");
const fs = require("fs");

// ===== BOT SETUP =====
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

client.commands = new Collection();

// ===== PREFIX SYSTEM =====
const prefixesFile = "./prefixes.json";
let prefixes = {};
if (fs.existsSync(prefixesFile)) {
  prefixes = JSON.parse(fs.readFileSync(prefixesFile, "utf8"));
}
const defaultPrefix = "!";

// ===== LOAD COMMAND FILES =====
const commandFiles = fs.readdirSync("./commands").filter(f => f.endsWith(".js"));
for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  client.commands.set(command.name, command);
  console.log(`✅ Loaded command: ${command.name}`);
}

const snipeCmd = require("./commands/snipe.js");

client.on("messageDelete", (msg) => {
  if (!msg.partial) snipeCmd.trackDeleted(msg);
});

// ===== MESSAGE HANDLER =====
client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.guild) return;

  const guildPrefix = prefixes[message.guild.id] || defaultPrefix;
  if (!message.content.startsWith(guildPrefix)) return;

  const args = message.content.slice(guildPrefix.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();

  const command = client.commands.get(commandName);
  if (!command) return;

  try {
    await command.execute(message, args, client);
  } catch (error) {
    console.error(error);
    message.reply("❌ There was an error executing that command.");
  }
});

// ===== READY EVENT =====
client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  client.user.setActivity(`Type ${defaultPrefix}help`, { type: 2 });
});

// ===== LOGIN =====
client.login(process.env.TOKEN);
