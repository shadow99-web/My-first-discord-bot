// ====================
// ⚡ Load Environment Variables
require("dotenv").config();
console.log("DEBUG TOKEN:", process.env.TOKEN ? "FOUND" : "NOT FOUND");
console.log("DEBUG CLIENT_ID:", process.env.CLIENT_ID ? "FOUND" : "NOT FOUND");

// ====================
// 🤖 Import modules
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
// ⚡ HTTP Server for Render
const port = process.env.PORT || 3000;
http.createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Bot is running!\n");
}).listen(port, () => console.log(`✅ HTTP server listening on port ${port}`));

// ====================
// 🔁 Self-ping to prevent sleep
const renderURL = process.env.RENDER_URL;
if (renderURL) {
    setInterval(async () => {
        try {
            const res = await fetch(renderURL);
            console.log(res.ok ? "✅ Self-ping successful" : `❌ Self-ping failed: ${res.status}`);
        } catch (err) {
            console.log("❌ Self-ping error:", err.message);
        }
    }, 4 * 60 * 1000); // every 4 minutes
}

// ====================
// 🤖 Discord Client Setup
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessageReactions, 
        GatewayIntentBits.GuildVoiceStates
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

client.quoteStates = new Map();
client.commands = new Collection();
client.snipes = new Map();
client.afk = new Map();
// ====================
// 🎵 Music Setup (DisTube)
// ====================
const { DisTube } = require("distube");
const { SpotifyPlugin } = require("@distube/spotify");
client.distube = new DisTube(client, {
    emitNewSongOnly: true, // keep this if you want only new song events
    plugins: [
        new SpotifyPlugin()
    ]
});

// DisTube Events
client.distube
    .on("playSong", (queue, song) =>
        queue.textChannel?.send(`🎶 | Playing: **${song.name}** - \`${song.formattedDuration}\``)
    )
    .on("addSong", (queue, song) =>
        queue.textChannel?.send(`➕ | Added: **${song.name}** - \`${song.formattedDuration}\``)
    )
    .on("error", (channel, e) => {
        if (channel) channel.send(`⚠️ | Error: \`${e.toString().slice(0, 1974)}\``);
        else console.error(e);
    });
// ====================
// 📦 Load Utilities
const { getPrefixes, savePrefixes, getAutorole, saveAutorole } = require("./utils/storage");
const blockHelpers = require("./utils/blockHelpers");
const { uploadTranscript } = require("./utils/transcriptUploader");

// ====================
// 📂 Load Commands safely (slash + prefix)
// ====================
const commandsData = [];
try {
    const commandFiles = fs.readdirSync("./commands").filter(f => f.endsWith(".js"));

    for (const file of commandFiles) {
        try {
            const command = require(`./commands/${file}`);
            const commandName =
  command.name ||
  command.data?.name ||
  file.replace(".js", "");
            command.name = commandName;
            
            if (commandName && typeof command.execute === "function") {
                client.commands.set(commandName, command);

                // Push only slash commands to REST deploy
                if (command.data?.toJSON) {
                    commandsData.push(command.data.toJSON());
                }

                console.log(`✅ Loaded command: ${commandName}`);
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
// 🔔 Safe event loader
const safeRequireEvent = (path, ...args) => {
    try {
        require(path)(...args);
        console.log(`✅ Loaded event: ${path}`);
    } catch (err) {
        console.warn(`⚠️ Failed to load event ${path}:`, err.message);
    }
};

// Events with extra args
safeRequireEvent("./events/message", client, getPrefixes, savePrefixes, blockHelpers);
safeRequireEvent("./events/autorole", client, getAutorole, saveAutorole);
safeRequireEvent("./events/interaction", client, blockHelpers);

// Events with only client
safeRequireEvent("./events/snipe", client);
safeRequireEvent("./events/guildMemberAdd", client);
safeRequireEvent("./events/autoMod", client);
safeRequireEvent("./events/guildMemberRemove.js", client);
safeRequireEvent("./events/truthdare", client);
safeRequireEvent("./events/modLogEvents", client);
safeRequireEvent("./events/antinukeHandler", client);
safeRequireEvent("./events/reactionRole.js", client);
safeRequireEvent("./events/activityRestore.js", client);
safeRequireEvent("./events/VC.js", client);
safeRequireEvent("./events/vcstore.js", client);
safeRequireEvent("./events/autoReact.js", client);
safeRequireEvent("./events/ready.js", client);
const voiceStateHandler = require("./events/voiceStateUpdate");
client.on("voiceStateUpdate", (oldState, newState) =>
    voiceStateHandler(client, oldState, newState)
);
// ====================
// 🚀 Deploy commands and login safely
async function deployCommandsAndLogin() {
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

        await client.login(process.env.TOKEN);
        console.log(`🤖 Logged in as ${client.user.tag}`);
        
        const { startPoller } = require("./Handlers/fbPoller");
startPoller(client);
        // ===============
    } catch (err) {
        console.error("❌ Failed to deploy commands or login:", err);
    }
}

// Start everything
deployCommandsAndLogin();

// ====================
// 🔴 Global error handlers
process.on("unhandledRejection", (err) => console.error("❌ Unhandled Promise Rejection:", err));
process.on("uncaughtException", (err) => console.error("❌ Uncaught Exception:", err));
process.on("warning", (warn) => console.warn("⚠️ Warning:", warn));
