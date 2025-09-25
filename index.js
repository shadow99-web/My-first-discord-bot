// ====================
// ⚡ Load Environment Variables
require("dotenv").config();
console.log("DEBUG TOKEN:", process.env.TOKEN ? "FOUND" : "NOT FOUND");
console.log("DEBUG CLIENT_ID:", process.env.CLIENT_ID ? "FOUND" : "NOT FOUND");

// ====================
// 🤖 Import Discord.js
const { Client, GatewayIntentBits, Partials, Collection, REST, Routes } = require("discord.js");
const http = require("http");
const fs = require("fs");
const mongoose = require("mongoose");

// ====================
// 🔌 Connect MongoDB safely
(async () => {
    try {
        const mongoURL = process.env.MONGO_URI;
        if (!mongoURL) throw new Error("MONGO_URI not found in environment variables");
        await mongoose.connect(mongoURL);
        console.log("✅ MongoDB connected successfully");
    } catch (err) {
        console.warn("⚠️ MongoDB connection failed:", err.message);
    }
})();

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
// 📂 Load Commands safely
const commandsData = [];
try {
    const commandFiles = fs.readdirSync("./commands").filter(f => f.endsWith(".js"));
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
} catch (err) {
    console.log("❌ Error reading commands folder:", err.message);
}

// ====================
// 🚀 Deploy Slash Commands safely
(async () => {
    try {
        const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);
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
        console.error("❌ Error deploying commands:", err.message);
    }
})();

// ====================
// 🔔 Load Event Handlers safely
const safeRequireEvent = (path, ...args) => {
    try {
        require(path)(...args);
        console.log(`✅ Loaded event: ${path}`);
    } catch (err) {
        console.warn(`⚠️ Failed to load event ${path}:`, err.message);
    }
};

safeRequireEvent("./events/autorole", client);
safeRequireEvent("./events/snipe", client);
safeRequireEvent("./events/message", client);
safeRequireEvent("./events/interaction", client); // pass blockHelpers if needed
safeRequireEvent("./events/guildMemberAdd", client);
safeRequireEvent("./events/autoMod", client);

// ====================
// 🔑 Login
client.once("ready", () => {
    console.log(`🤖 Logged in as ${client.user.tag}`);
});

client.login(process.env.TOKEN).catch(err => {
    console.error("❌ Discord login failed:", err.message);
});
