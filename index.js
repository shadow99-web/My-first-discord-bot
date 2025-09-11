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
    EmbedBuilder,
    SlashCommandBuilder,
    ChannelType,
    PermissionFlagsBits,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder
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
    }, 4 * 60 * 1000);
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

// Autorole storage
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

// ✅ Ensure ticket command is not duplicated
if (!commandsData.some(cmd => cmd.name === "ticket")) {
    commandsData.push(
        new SlashCommandBuilder()
            .setName("ticket")
            .setDescription("Open the ticket help panel")
            .toJSON()
    );
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
// 🟢 Autorole
// =============================
client.on("guildMemberAdd", async (member) => {
    try {
        const cfg = getAutorole();
        const guildCfg = cfg[member.guild.id];
        if (!guildCfg) return;

        const roleIds = (member.user.bot ? (guildCfg.bots || []) : (guildCfg.humans || []));
        if (!Array.isArray(roleIds) || roleIds.length === 0) return;

        const applied = [];
        for (const roleId of roleIds) {
            const role = member.guild.roles.cache.get(roleId);
            if (!role) continue;
            try {
                await member.roles.add(roleId, `Autorole: assigned on join`);
                applied.push(`<@&${roleId}>`);
            } catch (err) {
                console.warn(`Failed to add role ${roleId} to ${member.user.tag}:`, err.message);
            }
        }

        if (applied.length > 0) {
            const blueHeart = "<a:blue_heart:1414309560231002194>";
            const dmEmbed = new EmbedBuilder()
                .setColor("Blue")
                .setTitle(`Welcome to ${member.guild.name}!`)
                .setDescription(`${blueHeart} You have been given the following role(s):\n${applied.join(", ")}`)
                .setTimestamp();
            member.send({ embeds: [dmEmbed] }).catch(() => {});
        }
    } catch (err) {
        console.error("Error in autorole handler:", err);
    }
});

// =============================
// 🛠 Ticket System
// =============================
async function sendTicketPanel(channel) {
    const embed = new EmbedBuilder()
        .setColor("Blue")
        .setTitle("🎟️ Ticket System")
        .setDescription("<a:blue_heart:1414309560231002194> Need help? Select a category below to create a private ticket.")
        .setTimestamp();

    const menu = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId("ticket_menu")
            .setPlaceholder("📂 Choose a ticket category")
            .addOptions([
                { label: "General Support", value: "general", emoji: "💬" },
                { label: "Appeal to be Staff", value: "staff", emoji: "🧑‍💼" },
                { label: "Appeal Ban for Member", value: "ban", emoji: "🚫" },
                { label: "Report a Member", value: "report", emoji: "⚠️" }
            ])
    );

    await channel.send({ embeds: [embed], components: [menu] });
}

// =============================
// 💬 Autoresponse Helper
// =============================
const { getResponse, addResponse, removeResponse } = require("./Handlers/autoresponseHandler");

// =============================
// 💬 Message Handler (AFK + Autoresponse + Prefix + Snipe)
// =============================
client.on("messageCreate", async (message) => {
    if (!message.guild || message.author.bot) return;

    // ---------- SNIPE SYSTEM ----------
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

    // ---------- AFK Remove ----------
    if (client.afk.has(message.author.id)) {
        client.afk.delete(message.author.id);
        message.reply({
            embeds: [new EmbedBuilder()
                .setColor("Green")
                .setDescription("<a:blue_heart:1414309560231002194> You are no longer AFK.")]
        }).catch(() => {});
    }

    // ---------- AFK Mentions ----------
    if (message.mentions.users.size > 0) {
        message.mentions.users.forEach(user => {
            if (client.afk.has(user.id)) {
                const data = client.afk.get(user.id);
                const since = `<t:${Math.floor(data.since / 1000)}:R>`;
                const jump = `[Jump to Message](${message.url})`;
                message.reply({
                    embeds: [new EmbedBuilder()
                        .setColor("Blue")
                        .setTitle(`${user.tag} is AFK`)
                        .setDescription(`<a:blue_heart:1414309560231002194> Reason: **${data.reason}**\nSince: ${since}\n🔗 ${jump}`)]
                }).catch(() => {});
            }
        });
    }

    // ---------- Autoresponse ----------
    const response = getResponse(message.guild.id, message.content.toLowerCase());
    if (response) {
        const payload = {};
        if (response.text) payload.content = response.text;
        if (response.attachments && response.attachments.length > 0) payload.files = response.attachments;
        return message.channel.send(payload);
    }

    // ---------- Prefix Commands ----------
    const prefixes = getPrefixes();
    const guildPrefix = prefixes[message.guild.id] || defaultPrefix;
    if (!message.content.startsWith(guildPrefix)) return;

    const args = message.content.slice(guildPrefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    // Prefix ticket command
    if (commandName === "ticket") {
        await sendTicketPanel(message.channel);
        return message.reply("✅ Ticket panel sent!");
    }

    const command = client.commands.get(commandName);
    if (!command) return;

    if (isBlocked(message.author.id, message.guild.id, commandName)) {
        return message.reply("🚫 You are blocked from using this command.");
    }

    try {
        await command.execute({ message, args, client, isPrefix: true });
    } catch (err) {
        console.error(err);
        message.reply("❌ Something went wrong executing this command.").catch(() => {});
    }
});

// =============================
// 🎫 Ticket Interaction Handler
// =============================
client.on("interactionCreate", async (interaction) => {
    if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;

        if (isBlocked(interaction.user.id, interaction.guildId, interaction.commandName)) {
            return interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor("Red")
                    .setTitle("🚫 Command Blocked")
                    .setDescription(`You are blocked from using \`${interaction.commandName}\` here.`)
                ],
                ephemeral: true
            });
        }

        try {
            await command.execute({ interaction, client, isPrefix: false });
        } catch (err) {
            console.error(err);
            interaction.reply({ content: "❌ Something went wrong!", ephemeral: true }).catch(() => {});
        }
    }

    // Ticket select menu
    if (interaction.isStringSelectMenu() && interaction.customId === "ticket_menu") {
        const type = interaction.values[0];
        const existing = interaction.guild.channels.cache.find(c => c.name === `ticket-${interaction.user.id}`);
        if (existing) return interaction.reply({ content: "❌ You already have an open ticket!", ephemeral: true });

        const channel = await interaction.guild.channels.create({
            name: `ticket-${interaction.user.id}`,
            type: ChannelType.GuildText,
            permissionOverwrites: [
                { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }
            ]
        });

        const embed = new EmbedBuilder()
            .setColor("Green")
            .setAuthor({ name: `${interaction.user.username}'s Ticket`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
            .setDescription(`<a:blue_heart:1414309560231002194> Ticket Type: **${type}**\nWelcome <@${interaction.user.id}>, staff will assist you soon.\nPress 🔒 to close this ticket.`);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("ticket_close_button")
                .setLabel("🔒 Close Ticket")
                .setStyle(ButtonStyle.Danger)
        );

        await channel.send({ content: `<@${interaction.user.id}>`, embeds: [embed], components: [row] });
        return interaction.reply({ content: `✅ Ticket created: ${channel}`, ephemeral: true });
    }

    // Close ticket button
    if (interaction.isButton() && interaction.customId === "ticket_close_button") {
        if (!interaction.channel.name.startsWith("ticket-")) {
            return interaction.reply({ content: "❌ Only usable inside ticket channels.", ephemeral: true });
        }
        await interaction.reply({ content: "🔒 Closing ticket in **5 seconds**..." });
        setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
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
