// ==========================
// Discord Bot with Slash + Prefix Commands
// ==========================

require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  Partials,
  REST,
  Routes,
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder
} = require("discord.js");
const fs = require("fs");
const express = require("express");

// ==========================
// BOT CLIENT SETUP
// ==========================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
  ],
  partials: [Partials.Channel, Partials.Message]
});

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);
const defaultPrefix = "!";

// ==========================
// PREFIX SYSTEM
// ==========================
const prefixesFile = "./prefixes.json";
let prefixes = {};
if (fs.existsSync(prefixesFile)) {
  prefixes = JSON.parse(fs.readFileSync(prefixesFile, "utf8"));
}

// ==========================
// EXPRESS KEEP-ALIVE
// ==========================
const app = express();
app.get("/", (req, res) => res.send("Bot is alive!"));
app.listen(3000, () => console.log("🌐 Keep-alive server running"));

// ==========================
// SLASH COMMAND DEFINITIONS
// ==========================
const slashCommands = [
  new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Replies with Pong!"),
  new SlashCommandBuilder()
    .setName("avatar")
    .setDescription("Get a user's avatar")
    .addUserOption(option =>
      option.setName("user").setDescription("User to get avatar").setRequired(false)
    ),
  new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Ban a user")
    .addUserOption(option =>
      option.setName("user").setDescription("User to ban").setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Kick a user")
    .addUserOption(option =>
      option.setName("user").setDescription("User to kick").setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
  new SlashCommandBuilder()
    .setName("userinfo")
    .setDescription("Get information about a user")
    .addUserOption(option =>
      option.setName("user").setDescription("Target user").setRequired(false)
    ),
  new SlashCommandBuilder()
    .setName("serverinfo")
    .setDescription("Get information about this server"),
  new SlashCommandBuilder()
    .setName("setprefix")
    .setDescription("Set a custom prefix for this server")
    .addStringOption(option =>
      option.setName("prefix").setDescription("New prefix").setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
].map(cmd => cmd.toJSON());

// ==========================
// REGISTER SLASH COMMANDS
// ==========================
(async () => {
  try {
    console.log("⏳ Registering slash commands...");
    // Global
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), {
      body: slashCommands
    });
    console.log("✅ Global slash commands registered.");

    // Guild (instant update)
    if (process.env.GUILD_ID) {
      await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
        { body: slashCommands }
      );
      console.log("⚡ Guild slash commands registered (instant).");
    }
  } catch (err) {
    console.error("❌ Error registering slash commands:", err);
  }
})();

// ==========================
// SLASH COMMAND HANDLER
// ==========================
client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  if (commandName === "ping") {
    await interaction.reply("🏓 Pong!");
  }

  if (commandName === "avatar") {
    const user = interaction.options.getUser("user") || interaction.user;
    await interaction.reply(user.displayAvatarURL({ size: 1024 }));
  }

  if (commandName === "ban") {
    const user = interaction.options.getUser("user");
    if (!user) return interaction.reply("❌ No user found.");
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!member) return interaction.reply("❌ User not in this guild.");
    await member.ban({ reason: `Banned by ${interaction.user.tag}` });
    await interaction.reply(`✅ ${user.tag} has been banned.`);
  }

  if (commandName === "kick") {
    const user = interaction.options.getUser("user");
    if (!user) return interaction.reply("❌ No user found.");
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!member) return interaction.reply("❌ User not in this guild.");
    await member.kick(`Kicked by ${interaction.user.tag}`);
    await interaction.reply(`✅ ${user.tag} has been kicked.`);
  }

  if (commandName === "userinfo") {
    const user = interaction.options.getUser("user") || interaction.user;
    const member = interaction.guild.members.cache.get(user.id);

    const embed = new EmbedBuilder()
      .setTitle(`${user.tag}`)
      .setThumbnail(user.displayAvatarURL({ size: 1024 }))
      .addFields(
        { name: "ID", value: user.id, inline: true },
        { name: "Joined Server", value: member?.joinedAt?.toDateString() || "N/A", inline: true },
        { name: "Account Created", value: user.createdAt.toDateString(), inline: true }
      )
      .setColor("Blue");

    await interaction.reply({ embeds: [embed] });
  }

  if (commandName === "serverinfo") {
    const guild = interaction.guild;
    const embed = new EmbedBuilder()
      .setTitle(`${guild.name}`)
      .setThumbnail(guild.iconURL({ size: 1024 }))
      .addFields(
        { name: "Members", value: `${guild.memberCount}`, inline: true },
        { name: "Created", value: guild.createdAt.toDateString(), inline: true },
        { name: "Owner", value: `<@${guild.ownerId}>`, inline: true }
      )
      .setColor("Green");
    await interaction.reply({ embeds: [embed] });
  }

  if (commandName === "setprefix") {
    const newPrefix = interaction.options.getString("prefix");
    prefixes[interaction.guild.id] = newPrefix;
    fs.writeFileSync(prefixesFile, JSON.stringify(prefixes, null, 2));
    await interaction.reply(`✅ Prefix updated to \`${newPrefix}\``);
  }
});

// ==========================
// PREFIX COMMAND HANDLER
// ==========================
client.on("messageCreate", async message => {
  if (message.author.bot || !message.guild) return;

  const guildPrefix = prefixes[message.guild.id] || defaultPrefix;
  if (!message.content.startsWith(guildPrefix)) return;

  const args = message.content.slice(guildPrefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  if (command === "ping") {
    message.reply("🏓 Pong! (prefix)");
  }

  if (command === "setprefix") {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply("❌ You don’t have permission to change prefix.");
    }
    const newPrefix = args[0];
    if (!newPrefix) return message.reply("❌ Please provide a new prefix.");
    prefixes[message.guild.id] = newPrefix;
    fs.writeFileSync(prefixesFile, JSON.stringify(prefixes, null, 2));
    message.reply(`✅ Prefix updated to \`${newPrefix}\``);
  }

  if (command === "userinfo") {
    const user = message.mentions.users.first() || message.author;
    const member = message.guild.members.cache.get(user.id);
    const embed = new EmbedBuilder()
      .setTitle(`${user.tag}`)
      .setThumbnail(user.displayAvatarURL({ size: 1024 }))
      .addFields(
        { name: "ID", value: user.id, inline: true },
        { name: "Joined Server", value: member?.joinedAt?.toDateString() || "N/A", inline: true },
        { name: "Account Created", value: user.createdAt.toDateString(), inline: true }
      )
      .setColor("Blue");
    message.reply({ embeds: [embed] });
  }
});

// ==========================
// BOT READY
// ==========================
client.on("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  try {
    client.user.setActivity(`Type ${defaultPrefix}help | /help`, { type: 3 });
  } catch (err) {
    console.error("❌ Failed to set activity:", err);
  }
});

// ==========================
// BOT LOGIN
// ==========================
client.login(process.env.TOKEN);
