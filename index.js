require("dotenv").config();
const { Client, GatewayIntentBits, Partials, Collection, REST, Routes, EmbedBuilder } = require("discord.js");
const fs = require("fs");
const http = require("http");

// ===== HTTP SERVER FOR RENDER =====
const port = process.env.PORT || 3000;
http.createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Bot is running!\n");
}).listen(port, () => console.log(`✅ HTTP server listening on port ${port}`));

// ===== BOT SETUP =====
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

// ===== COLLECTIONS =====
client.commands = new Collection();
client.snipes = new Map();
client.afk = new Map();

// ===== DEFAULT PREFIX =====
const defaultPrefix = "!";

// ===== PREFIX STORAGE 🔵 =====
const prefixFile = "./prefixes.json";
if (!fs.existsSync(prefixFile)) fs.writeFileSync(prefixFile, "{}");

function getPrefixes() {
    return JSON.parse(fs.readFileSync(prefixFile, "utf8"));
}
function savePrefixes(prefixes) {
    fs.writeFileSync(prefixFile, JSON.stringify(prefixes, null, 4));
}

// ===== BLOCKED USERS STORAGE 🔴 =====
const blockedFile = "./blocked.json";
if (!fs.existsSync(blockedFile)) fs.writeFileSync(blockedFile, "{}");

function getBlocked() {
    return JSON.parse(fs.readFileSync(blockedFile, "utf8"));
}
function saveBlocked(data) {
    fs.writeFileSync(blockedFile, JSON.stringify(data, null, 4));
}

// ===== YOUR DEV ID (cannot be blocked) =====
const devID = process.env.DEV_ID; // 🔑 set in .env

// ===== LOAD COMMANDS =====
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

// ===== AUTO DEPLOY SLASH COMMANDS =====
const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);
(async () => {
    try {
        if (process.env.GUILD_ID) {
            console.log(`🚀 Deploying ${commandsData.length} commands to guild ${process.env.GUILD_ID}...`);
            await rest.put(
                Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
                { body: commandsData }
            );
            console.log("✅ Guild commands deployed successfully!");
        }
        console.log(`🚀 Deploying ${commandsData.length} commands globally...`);
        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commandsData }
        );
        console.log("✅ Global commands deployed successfully! (may take up to 1 hour)");
    } catch (error) {
        console.error("❌ Error deploying commands:", error);
    }
})();

// ===== READY EVENT =====
client.once("ready", () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
    client.user.setActivity(`Type ${defaultPrefix}help or /help`, { type: "WATCHING" });
});

// ===== MESSAGE DELETE EVENT (SNIPE) =====
client.on("messageDelete", (message) => {
    if (!message.guild || message.author?.bot) return;
    const snipes = client.snipes.get(message.channel.id) || [];
    snipes.unshift({
        content: message.content || "*No text (embed/attachment)*",
        author: message.author.tag,
        avatar: message.author.displayAvatarURL({ dynamic: true }),
        createdAt: message.createdTimestamp,
        attachment: message.attachments.first() ? message.attachments.first().url : null
    });
    if (snipes.length > 5) snipes.pop();
    client.snipes.set(message.channel.id, snipes);
});

// ===== SLASH COMMAND HANDLER =====
client.on("interactionCreate", async (interaction) => {
    if (!interaction.isCommand()) return;
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    // 🔴 Block check with embed
    const blocked = getBlocked();
    if (interaction.user.id !== devID && blocked[interaction.guildId]?.includes(interaction.user.id)) {
        const embed = new EmbedBuilder()
            .setColor("Red")
            .setTitle("🚫 Command Blocked")
            .setDescription("You are **blocked** from using commands in this server.")
            .setFooter({ text: "Contact an admin if you think this is a mistake." })
            .setTimestamp();
        return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    try {
        await command.execute({ interaction, client });
    } catch (error) {
        console.error(`❌ Error executing slash command ${interaction.commandName}:`, error);
        if (interaction.replied || interaction.deferred) {
            interaction.followUp({ content: "❌ Something went wrong!", ephemeral: true }).catch(() => {});
        } else {
            interaction.reply({ content: "❌ Something went wrong!", ephemeral: true }).catch(() => {});
        }
    }
});

// ===== PREFIX COMMAND + AFK HANDLER =====
client.on("messageCreate", async (message) => {
    if (!message.guild || message.author.bot) return;

    const blueHeart = "<a:blue_heart_1414309560231002194:1414309560231002194>";

    // --- USER RETURNING FROM AFK ---
    if (client.afk.has(message.author.id)) {
        const afkData = client.afk.get(message.author.id);
        client.afk.delete(message.author.id);

        const embed = new EmbedBuilder()
            .setColor("Blue")
            .setAuthor({ name: `${message.author.tag} is back!`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
            .setDescription(`${blueHeart} Your AFK status has been removed.`)
            .setTimestamp();

        if (afkData.mentions.length > 0) {
            let mentionList = afkData.mentions.slice(0, 5).map((m, i) =>
                `${i + 1}. **${m.user}** in <#${m.channel}> → [Jump](${m.url})`
            ).join("\n");
            if (afkData.mentions.length > 5) {
                mentionList += `\n...and ${afkData.mentions.length - 5} more mentions.`;
            }
            embed.addFields({ name: `📌 Mentions while AFK`, value: mentionList, inline: false });
        }

        message.reply({ embeds: [embed] }).catch(() => {});
    }

    // --- NOTIFY MENTIONED AFK USERS ---
    message.mentions.users.forEach((mentioned) => {
        if (client.afk.has(mentioned.id)) {
            const afk = client.afk.get(mentioned.id);
            const embed = new EmbedBuilder()
                .setColor("Blue")
                .setAuthor({ name: `${mentioned.tag} is AFK`, iconURL: mentioned.displayAvatarURL({ dynamic: true }) })
                .setDescription(`${blueHeart} Reason: **${afk.reason}** (since <t:${Math.floor(afk.since / 1000)}:R>)`)
                .setTimestamp();
            message.reply({ embeds: [embed] }).catch(() => {});

            afk.mentions.push({
                user: message.author.tag,
                channel: message.channel.id,
                url: message.url
            });
            client.afk.set(mentioned.id, afk);
        }
    });

    // ===== GET PREFIX FOR THIS GUILD 🔵 =====
    const prefixes = getPrefixes();
    const guildPrefix = prefixes[message.guild.id] || defaultPrefix;

    if (!message.content.startsWith(guildPrefix)) return;
    const args = message.content.slice(guildPrefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();
    const command = client.commands.get(commandName);
    if (!command) return;

    // 🔴 Block check with embed
    const blocked = getBlocked();
    if (message.author.id !== devID && blocked[message.guild.id]?.includes(message.author.id)) {
        const embed = new EmbedBuilder()
            .setColor("Red")
            .setTitle("🚫 Command Blocked")
            .setDescription("You are **blocked** from using commands in this server.")
            .setFooter({ text: "Contact an admin if you think this is a mistake." })
            .setTimestamp();
        return message.reply({ embeds: [embed] });
    }

    try {
        await command.execute({ message, args, isPrefix: true, client });
    } catch (error) {
        console.error(`❌ Error executing prefix command ${commandName}:`, error);
        message.reply("❌ Something went wrong executing this command.").catch(() => {});
    }
});

// ===== LOGIN =====
client.login(process.env.TOKEN);
