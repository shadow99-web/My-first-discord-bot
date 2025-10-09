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
const blockHelpers = require("./utils/block");

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
// ====================
// 📡 Load Event Handlers
// ====================
const eventFiles = fs.readdirSync("./events").filter(f => f.endsWith(".js"));

for (const file of eventFiles) {
    try {
        const event = require(`./events/${file}`);
        const eventName = file.split(".")[0];

        if (eventName === "ready") {
            // Run once when bot starts
            client.once("ready", (...args) => event(client, ...args));
        } else {
            // Run for all other events
            client.on(eventName, (...args) => event(client, ...args));
        }

        console.log(`✅ Loaded event: ${eventName}`);
    } catch (err) {
        console.warn(`⚠️ Failed to load event file: ${file} — ${err.message}`);
    }
}

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
        // ====================
// Giveaway Scheduler
// ====================
const Giveaway = require("./models/Giveaway");

const startGiveawayScheduler = (client) => {
    const checkIntervalMs = 15_000; // every 15 seconds
    setInterval(async () => {
        try {
            const now = new Date();
            const exp = await Giveaway.find({ ended: false, endAt: { $lte: now } });
            for (const gw of exp) {
                try {
                    const giveawayCommand = client.commands.get("giveaway");
                    if (giveawayCommand && typeof giveawayCommand.endGiveaway === "function") {
                        await giveawayCommand.endGiveaway(gw, client);
                    } else {
                        // fallback
                        gw.ended = true;
                        const winners = (gw.participants?.length)
                            ? gw.participants.sort(() => 0.5 - Math.random()).slice(0, gw.winnersCount)
                            : [];
                        gw.winners = winners;
                        await gw.save();
                        const ch = await client.channels.fetch(gw.channelId).catch(() => null);
                        if (ch) {
                            await ch.send({
                                content: winners.length
                                    ? `😄 Giveaway ended! Winners: ${winners.map(id => `<@${id}>`).join(", ")} — Prize: **${gw.prize}**`
                                    : `😞 Giveaway ended for **${gw.prize}**, but there were no participants.`,
                            }).catch(() => {});
                        }
                    }
                } catch (err) {
                    console.error("Error ending giveaway:", err);
                }
            }
        } catch (err) {
            console.error("Giveaway scheduler error:", err);
        }
    }, checkIntervalMs);
};

// Start scheduler after login
client.once("ready", () => {
    startGiveawayScheduler(client);
});
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
