require("dotenv").config();
const { Client, GatewayIntentBits, Partials, Collection, REST, Routes } = require("discord.js");
const fs = require("fs");
const http = require("http");

// ===== HTTP SERVER FOR RENDER =====
const port = process.env.PORT || 3000;
http.createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Bot is running!\n");
}).listen(port, () => {
    console.log(`✅ HTTP server listening on port ${port}`);
});

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
client.afk = new Map(); // { userId: { reason, since, mentions: [] } }

// ===== PREFIX =====
const defaultPrefix = "!";

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
        attachment: message.attachments.first()
            ? message.attachments.first().url
            : null
    });

    if (snipes.length > 5) snipes.pop();
    client.snipes.set(message.channel.id, snipes);
});

// ===== SLASH COMMAND HANDLER =====
client.on("interactionCreate", async (interaction) => {
    if (!interaction.isCommand()) return;
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        await command.execute({ interaction, client });
    } catch (error) {
        console.error(`❌ Error executing slash command ${interaction.commandName}:`, error);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: "❌ Something went wrong!", ephemeral: true });
        } else {
            await interaction.reply({ content: "❌ Something went wrong!", ephemeral: true });
        }
    }
});

// ===== PREFIX COMMAND + AFK HANDLER =====
client.on("messageCreate", async (message) => {
    if (!message.guild || message.author.bot) return;

    // --- AFK Return Handler ---
    if (client.afk.has(message.author.id)) {
        const afkData = client.afk.get(message.author.id);
        client.afk.delete(message.author.id);

        let replyText = `✅ Welcome back ${message.author}, your AFK status has been removed.`;

        if (afkData.mentions.length > 0) {
            replyText += `\n\n📌 While you were away, you were mentioned **${afkData.mentions.length}** times:\n`;
            afkData.mentions.slice(0, 5).forEach((m, i) => {
                replyText += `\n${i + 1}. **${m.user}** in <#${m.channel}> → [Jump](${m.url})`;
            });
            if (afkData.mentions.length > 5) {
                replyText += `\n...and ${afkData.mentions.length - 5} more mentions.`;
            }
        }

        message.reply(replyText);
    }

    // --- AFK Mention Notifier ---
    message.mentions.users.forEach((mentioned) => {
        if (client.afk.has(mentioned.id)) {
            const afk = client.afk.get(mentioned.id);

            message.reply(
                `💤 ${mentioned} is AFK — **${afk.reason}** (since <t:${Math.floor(afk.since / 1000)}:R>)`
            );

            afk.mentions.push({
                user: message.author.tag,
                channel: message.channel.id,
                url: message.url
            });

            client.afk.set(mentioned.id, afk);
        }
    });

    // --- PREFIX COMMAND EXECUTION ---
    if (!message.content.startsWith(defaultPrefix)) return;

    const args = message.content.slice(defaultPrefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();
    const command = client.commands.get(commandName);
    if (!command) return;

    try {
        await command.execute({ message, args, isPrefix: true, client });
    } catch (error) {
        console.error(`❌ Error executing prefix command ${commandName}:`, error);
        message.reply("❌ Something went wrong executing this command.");
    }
});

// ===== LOGIN =====
client.login(process.env.TOKEN);
