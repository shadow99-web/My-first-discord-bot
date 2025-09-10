// =============================
// 🌐 Environment Setup
// =============================
require("dotenv").config();
const {
    Client,
    GatewayIntentBits,
    Partials,
    Collection,
    REST,
    Routes,
    EmbedBuilder
} = require("discord.js");
const fs = require("fs");
const http = require("http");

// =============================
// ⚡ HTTP Server (Render Support)
// =============================
const port = process.env.PORT || 3000;
http.createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Bot is running!\n");
}).listen(port, () => console.log(`✅ HTTP server listening on port ${port}`));

// 🔁 Self-ping (prevent Render sleep)
const renderURL = process.env.RENDER_URL;
if (renderURL) {
    setInterval(() => {
        fetch(renderURL)
            .then(() => console.log("✅ Self-ping successful"))
            .catch(() => console.log("❌ Self-ping failed"));
    }, 4 * 60 * 1000); // every 4 minutes
}

// =============================
// 🤖 Client Setup
// =============================
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

// =============================
// 📦 Collections & Storage
// =============================
client.commands = new Collection();
client.snipes = new Map();
client.afk = new Map();

// Prefix
const defaultPrefix = "!";
const prefixFile = "./prefixes.json";
if (!fs.existsSync(prefixFile)) fs.writeFileSync(prefixFile, "{}");
const getPrefixes = () => JSON.parse(fs.readFileSync(prefixFile, "utf8"));
const savePrefixes = (prefixes) => fs.writeFileSync(prefixFile, JSON.stringify(prefixes, null, 4));

// Blocked Users
const blockFile = "./block.json";
if (!fs.existsSync(blockFile)) fs.writeFileSync(blockFile, "{}");
const getBlocked = () => JSON.parse(fs.readFileSync(blockFile, "utf8"));
const saveBlocked = (data) => fs.writeFileSync(blockFile, JSON.stringify(data, null, 4));

// ===== Autorole storage (new) =====
const autoroleFile = "./autorole.json";
if (!fs.existsSync(autoroleFile)) fs.writeFileSync(autoroleFile, "{}");
const getAutorole = () => {
    try {
        return JSON.parse(fs.readFileSync(autoroleFile, "utf8") || "{}");
    } catch (e) {
        console.error("Failed to read autorole.json:", e);
        return {};
    }
};
const saveAutorole = (data) => fs.writeFileSync(autoroleFile, JSON.stringify(data, null, 4));

// Dev ID
const devID = process.env.DEV_ID;

// =============================
// 🚫 Block Helpers
// =============================
const isBlocked = (userId, guildId, commandName) => {
    const blocked = getBlocked();
    const guildBlocked = blocked[guildId] || {};
    const commandBlocked = guildBlocked[commandName] || [];
    return userId !== devID && commandBlocked.includes(userId);
};

const addBlock = (guildId, commandName, userId) => {
    const blocked = getBlocked();
    if (!blocked[guildId]) blocked[guildId] = {};
    if (!blocked[guildId][commandName]) blocked[guildId][commandName] = [];
    if (!blocked[guildId][commandName].includes(userId)) {
        blocked[guildId][commandName].push(userId);
        saveBlocked(blocked);
    }
};

const removeBlock = (guildId, commandName, userId) => {
    const blocked = getBlocked();
    if (blocked[guildId]?.[commandName]) {
        blocked[guildId][commandName] = blocked[guildId][commandName].filter(id => id !== userId);
        if (blocked[guildId][commandName].length === 0) delete blocked[guildId][commandName];
        saveBlocked(blocked);
    }
};

const getBlockedUsers = (guildId, commandName) => {
    const blocked = getBlocked();
    return blocked[guildId]?.[commandName] || [];
};

// =============================
// 📂 Load Commands
// =============================
const commandFiles = fs.readdirSync("./commands").filter(f => f.endsWith(".js"));
const commandsData = [];

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    if (command?.data?.name && command?.execute) {
        client.commands.set(command.data.name, command);
        commandsData.push(command.data.toJSON());
        console.log(`✅ Loaded command: ${command.data.name}`);
    } else {
        console.log(`⚠️ Skipped invalid command file: ${file}`);
    }
}

// =============================
// 🚀 Deploy Slash Commands
// =============================
const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);
(async () => {
    try {
        if (process.env.GUILD_ID) {
            await rest.put(
                Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
                { body: commandsData }
            );
            console.log("✅ Guild commands deployed!");
        }
        await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commandsData });
        console.log("✅ Global commands deployed!");
    } catch (err) {
        console.error("❌ Error deploying commands:", err);
    }
})();

// =============================
// 🔔 Ready Event
// =============================
client.once("ready", () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
    client.user.setActivity(`Type ${defaultPrefix}help or /help`, { type: "WATCHING" });
});

// =============================
// 🗑️ Message Delete (Snipe)
// =============================
client.on("messageDelete", (message) => {
    if (!message.guild || message.author?.bot) return;
    const snipes = client.snipes.get(message.channel.id) || [];
    snipes.unshift({
        content: message.content || "*No text (embed/attachment)*",
        author: message.author.tag,
        avatar: message.author.displayAvatarURL({ dynamic: true }),
        createdAt: message.createdTimestamp,
        attachment: message.attachments.first()?.url || null
    });
    if (snipes.length > 5) snipes.pop();
    client.snipes.set(message.channel.id, snipes);
});

// =============================
// 🟢 Autorole: assign roles on join (NEW)
// =============================
client.on("guildMemberAdd", async (member) => {
    try {
        const cfg = getAutorole();
        const guildCfg = cfg[member.guild.id];
        if (!guildCfg) return; // nothing configured

        // choose list by whether member is a bot
        const roleIds = (member.user.bot ? (guildCfg.bots || []) : (guildCfg.humans || []));
        if (!Array.isArray(roleIds) || roleIds.length === 0) return;

        // Try to add each role (skip if role missing)
        const applied = [];
        for (const roleId of roleIds) {
            const role = member.guild.roles.cache.get(roleId);
            if (!role) continue;
            try {
                await member.roles.add(roleId, `Autorole: assigned on join`);
                applied.push(`<@&${roleId}>`);
            } catch (err) {
                // Could be permission or role hierarchy issue; log but keep going
                console.warn(`Failed to add role ${roleId} to ${member.user.tag} in ${member.guild.name}:`, err.message);
            }
        }

        // Optional: send a small DM informing the new member (safe try/catch — many DMs fail)
        if (applied.length > 0) {
            const blueHeart = "<a:blue_heart_1414309560231002194>";
            const dmEmbed = new EmbedBuilder()
                .setColor("Blue")
                .setTitle(`Welcome to ${member.guild.name}!`)
                .setDescription(`${blueHeart} You have been given the following role(s):\n${applied.join(", ")}`)
                .setTimestamp();
            member.send({ embeds: [dmEmbed] }).catch(() => {});
        }
    } catch (err) {
        console.error("Error in guildMemberAdd autorole handler:", err);
    }
});

// =============================
// 🛠 Slash Command Handler
// =============================
client.on("interactionCreate", async (interaction) => {
    if (!interaction.isCommand()) return;
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    if (isBlocked(interaction.user.id, interaction.guildId, interaction.commandName)) {
        return interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor("Red")
                    .setTitle("🚫 Command Blocked")
                    .setDescription(`You are **blocked** from using \`${interaction.commandName}\` in this server.`)
                    .setFooter({ text: "Contact an admin if you think this is a mistake." })
                    .setTimestamp()
            ],
            ephemeral: true
        });
    }

    try {
        // ℹ️ Auto usage help
        if (command.usage && interaction.options._hoistedOptions.length === 0) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Blue")
                        .setTitle(`ℹ️ ${interaction.commandName} Command`)
                        .setDescription(command.description || "No description provided.")
                        .addFields({ name: "Usage", value: `\`${command.usage}\`` })
                        .setFooter({ text: `${client.user.username} | Made with 💙` })
                ],
                ephemeral: true
            });
        }

        await command.execute({ interaction, client, isPrefix: false });
    } catch (err) {
        console.error(err);
        if (interaction.replied || interaction.deferred) {
            interaction.followUp({ content: "❌ Something went wrong!", ephemeral: true }).catch(() => {});
        } else {
            interaction.reply({ content: "❌ Something went wrong!", ephemeral: true }).catch(() => {});
        }
    }
});

// =============================
// 💬 Prefix Commands + AFK System
// =============================
client.on("messageCreate", async (message) => {
    if (!message.guild || message.author.bot) return;

    // AFK remove if user returns
    if (client.afk.has(message.author.id)) {
        const data = client.afk.get(message.author.id);
        client.afk.delete(message.author.id);

        message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor("Green")
                    .setAuthor({ name: `${message.author.username} is back!`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                    .setDescription("✅ You are no longer AFK.")
                    .setTimestamp()
            ]
        }).catch(() => {});

        if (data.mentions?.length) {
            const mentionsList = data.mentions.map(m => `<@${m}>`).join(", ");
            message.channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Yellow")
                        .setAuthor({ name: "While you were AFK...", iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                        .setDescription(`📩 You were mentioned by: ${mentionsList}`)
                        .setTimestamp()
                ]
            }).catch(() => {});
        }
    }

    // AFK notify when pinged
    if (message.mentions.users.size > 0) {
        message.mentions.users.forEach(user => {
            if (client.afk.has(user.id)) {
                const data = client.afk.get(user.id);
                const since = `<t:${Math.floor(data.since / 1000)}:R>`;

                message.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("Blue")
                            .setAuthor({ name: `${user.tag} is AFK`, iconURL: user.displayAvatarURL({ dynamic: true }) })
                            .setDescription(`💤 Reason: **${data.reason}**\n⏰ Since: ${since}`)
                            .setFooter({ text: "They will see your mention later." })
                            .setTimestamp()
                    ]
                }).catch(() => {});

                if (!data.mentions.includes(message.author.id)) {
                    data.mentions.push(message.author.id);
                    client.afk.set(user.id, data);
                }
            }
        });
    }

    // Prefix command handling
    const prefixes = getPrefixes();
    const guildPrefix = prefixes[message.guild.id] || defaultPrefix;
    if (!message.content.startsWith(guildPrefix)) return;

    const args = message.content.slice(guildPrefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();
    const command = client.commands.get(commandName);
    if (!command) return;

    if (isBlocked(message.author.id, message.guild.id, commandName)) {
        return message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor("Red")
                    .setTitle("🚫 Command Blocked")
                    .setDescription(`You are **blocked** from using \`${commandName}\` in this server.`)
                    .setFooter({ text: "Contact an admin if you think this is a mistake." })
                    .setTimestamp()
            ]
        });
    }

    try {
        // ℹ️ Auto usage help
        if (command.usage && args.length === 0) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Blue")
                        .setTitle(`ℹ️ ${guildPrefix}${commandName} Command`)
                        .setDescription(command.description || "No description provided.")
                        .addFields({ name: "Usage", value: `\`${command.usage}\`` })
                        .setFooter({ text: `${client.user.username} | Made with 💙` })
                ]
            });
        }

        await command.execute({ message, args, client, isPrefix: true });
    } catch (err) {
        console.error(err);
        message.reply("❌ Something went wrong executing this command.").catch(() => {});
    }
});

// =============================
// 🔑 Login
// =============================
client.login(process.env.TOKEN);

// =============================
// 📤 Export Helpers
// =============================
module.exports = { addBlock, removeBlock, getBlockedUsers, isBlocked };
