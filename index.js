require("dotenv").config();
const { Client, GatewayIntentBits, Collection } = require("discord.js");
const fs = require("fs");

// ===== BOT SETUP =====
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessageReactions
    ]
});

// ===== COMMAND COLLECTION =====
client.commands = new Collection();

// ===== SNIPE STORAGE =====
client.snipes = new Map();

// ===== PREFIX =====
const defaultPrefix = "!";

// ===== LOAD COMMAND FILES =====
const commandFiles = fs.readdirSync("./commands").filter(f => f.endsWith(".js"));
for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    if (command?.data?.name && command?.execute) {
        client.commands.set(command.data.name, command);
        console.log(`✅ Loaded command: ${command.data.name}`);
    } else {
        console.log(`⚠️ Skipped invalid command file: ${file}`);
    }
}

// ===== READY EVENT =====
client.once("ready", () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
    client.user.setActivity(`Type ${defaultPrefix}help or /help`, { type: "WATCHING" });
});

// ===== MESSAGE DELETE EVENT (for snipe) =====
client.on("messageDelete", (message) => {
    if (!message.guild || message.author.bot) return;
    client.snipes.set(message.channel.id, {
        content: message.content || "*Embed/Attachment deleted*",
        author: message.author.tag,
        createdAt: message.createdAt
    });
});

// ===== SLASH COMMAND HANDLER =====
client.on("interactionCreate", async (interaction) => {
    if (!interaction.isCommand()) return;
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        await command.execute({ interaction });
    } catch (error) {
        console.error(`❌ Error executing slash command ${interaction.commandName}:`, error);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: "❌ Something went wrong!", ephemeral: true });
        } else {
            await interaction.reply({ content: "❌ Something went wrong!", ephemeral: true });
        }
    }
});

// ===== PREFIX COMMAND HANDLER =====
client.on("messageCreate", async (message) => {
    if (!message.guild || message.author.bot) return;
    if (!message.content.startsWith(defaultPrefix)) return;

    const args = message.content.slice(defaultPrefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    const command = client.commands.get(commandName);
    if (!command) return;

    try {
        await command.execute({ message, args, isPrefix: true });
    } catch (error) {
        console.error(`❌ Error executing prefix command ${commandName}:`, error);
        message.reply("❌ Something went wrong executing this command.");
    }
});

// ===== LOGIN =====
client.login(process.env.TOKEN);
