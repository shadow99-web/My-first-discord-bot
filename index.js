// ====================
// ⚡ Load Environment Variables
require("dotenv").config();
console.log("DEBUG TOKEN:", process.env.TOKEN ? "FOUND" : "NOT FOUND");

// ====================
// 🤖 Import Discord.js
const { Client, GatewayIntentBits, Partials, Collection, REST, Routes } = require("discord.js");
const http = require("http");
const fs = require("fs");

// ====================
// 🔌 Database (optional)
const connectDB = require("./db");
connectDB();

// ====================
// ⚡ HTTP Server (optional for Render)
const port = process.env.PORT || 3000;
http.createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Bot is running!\n");
}).listen(port, () => console.log(`✅ HTTP server listening on port ${port}`));

// ====================
// 🔁 Self-ping (optional)
const renderURL = process.env.RENDER_URL;
if (renderURL) {
    setInterval(async () => {
        try {
            const res = await fetch(renderURL);
            if (res.ok) console.log("✅ Self-ping successful");
            else console.log(`❌ Self-ping failed: ${res.status}`);
        } catch (err) {
            console.log("❌ Self-ping error:", err.message);
        }
    }, 4 * 60 * 1000);
}

// ====================
// 🤖 Client Setup
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
// 📂 Load Commands
const commandFiles = fs.readdirSync("./commands").filter(f => f.endsWith(".js"));
const commandsData = [];

for (const file of commandFiles) {
    try {
        const command = require(`./commands/${file}`);
        if (command?.data?.name && command?.execute) {
            client.commands.set(command.data.name, command);
            commandsData.push(command.data.toJSON());
            console.log(`✅ Loaded command: ${command.data.name}`);
        } else {
            console.log(`⚠️ Skipped invalid command: ${file}`);
        }
    } catch (err) {
        console.log(`❌ Error loading command ${file}: ${err.message}`);
    }
}

// ====================
// 🚀 Deploy Slash Commands
(async () => {
    const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);
    try {
        if (process.env.GUILD_ID) {
            await rest.put(
                Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
                { body: commandsData }
            );
            console.log("✅ Guild commands deployed!");
        }
        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commandsData }
        );
        console.log("✅ Global commands deployed!");
    } catch (err) {
        console.error("❌ Error deploying commands:", err);
    }
})();

// ====================
// 🔔 Load Event Handlers
try { require("./events/autorole")(client); } catch (err) { console.log(err); }
try { require("./events/snipe")(client); } catch (err) { console.log(err); }
try { require("./events/message")(client); } catch (err) { console.log(err); }
try { require("./events/interaction")(client); } catch (err) { console.log(err); }
try { require("./events/guildMemberAdd")(client); } catch (err) { console.log(err); }
try { require("./events/autoMod")(client); } catch (err) { console.log(err); }

// ====================
// 🔑 Login
client.once("ready", () => {
    console.log(`🤖 Logged in as ${client.user.tag}`);
});

client.login(process.env.TOKEN).catch(err => {
    console.error("❌ Login failed:", err.message);
});
