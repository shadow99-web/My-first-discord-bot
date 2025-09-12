require("dotenv").config();
const { Client, GatewayIntentBits, Partials, Collection } = require("discord.js");
const http = require("http");
const fetch = require("node-fetch"); // for self-ping

// ====================
// ⚡ HTTP Server (Render)
// ====================
const port = process.env.PORT || 3000;
http.createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Bot is running!\n");
}).listen(port, () => console.log(`✅ HTTP server listening on port ${port}`));

const renderURL = process.env.RENDER_URL;
if (renderURL) setInterval(() => fetch(renderURL).then(() => console.log("✅ Self-ping")).catch(() => console.log("❌ Self-ping failed")), 4*60*1000);

// ====================
// 🤖 Client Setup
// ====================
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessageReactions
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

client.commands = new Collection();
client.snipes = new Map();
client.afk = new Map();

// ====================
// 📦 Load Utilities
// ====================
const { getPrefixes, getAutorole } = require("./utils/storage");
const blockHelpers = require("./utils/block");

// ====================
// 📂 Load Commands
// ====================
const fs = require("fs");
const commandFiles = fs.readdirSync("./commands").filter(f => f.endsWith(".js"));
const commandsData = [];

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    if (command?.data?.name && command?.execute) {
        client.commands.set(command.data.name, command);
        commandsData.push(command.data.toJSON());
        console.log(`✅ Loaded command: ${command.data.name}`);
    } else console.log(`⚠️ Skipped invalid command: ${file}`);
}

// ====================
// 🚀 Deploy Slash Commands
// ====================
const { REST, Routes } = require("discord.js");
const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);
(async () => {
    try {
        if (process.env.GUILD_ID) {
            await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), { body: commandsData });
            console.log("✅ Guild commands deployed!");
        }
        await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commandsData });
        console.log("✅ Global commands deployed!");
    } catch (err) { console.error("❌ Error deploying commands:", err); }
})();

// ====================
// 🔔 Load Events
// ====================
require("./events/autorole")(client, getAutorole);
require("./events/snipe")(client);
require("./events/message")(client, getPrefixes, blockHelpers);
require("./events/interaction")(client, blockHelpers);

// ====================
// 🔑 Login
// ====================
client.login(process.env.TOKEN);
