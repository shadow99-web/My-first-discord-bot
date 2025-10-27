const { EmbedBuilder } = require("discord.js");
const { getResponse } = require("../Handlers/autoresponseHandler");
const { sendTicketPanel } = require("../Handlers/ticketHandler");
const { defaultPrefix } = require("../utils/storage");
const ChatBotConfig = require("../models/chatbot");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const Level = require("../models/Level");
const LevelReward = require("../models/LevelReward");
const { RankCardBuilder, Font } = require("canvacord");
Font.loadDefault();
const RankChannel = require("../models/RankChannel");
const RankSettings = require("../models/RankSettings");

module.exports = function (client, getPrefixes, blockHelpers) {
  client.on("messageCreate", async (message) => {
    if (!message.guild || message.author.bot) return;

    // ---------- XP + Level System ----------
    // ---------- Check if rank system is enabled ----------
const rankSettings = await RankSettings.findOne({ guildId: message.guild.id });
if (rankSettings && rankSettings.enabled === false) return; // Stop if disabled
    
    const xpGain = Math.floor(Math.random() * 10) + 5; // 5–15 XP per message
    const guildId = message.guild.id;
    const userId = message.author.id;

    let userData = await Level.findOne({ userId, guildId });
    if (!userData) {
      userData = await Level.create({ userId, guildId, xp: 0, level: 0 });
    }

    userData.xp += xpGain;

    // Formula for XP needed to level up
    const nextLevelXP = 100 + userData.level * 50;

    // If user leveled up
    if (userData.xp >= nextLevelXP) {
      const earnedXP = userData.xp;
      userData.level += 1;
      userData.xp -= nextLevelXP

      // 🏆 Create rank card
      // 🔍 Find rank-up channel or fallback to current one
      const rankChannelData = await RankChannel.findOne({ guildId });
      const background =
  (rankChannelData && rankChannelData.background)
    ? rankChannelData.background
    : "color:#F2F3F5";

// ...later in your leveling system
const rankCard = new RankCardBuilder()
  .setDisplayName(message.author.username)
  .setAvatar(message.author.displayAvatarURL({ extension: "png" }))
  .setLevel(userData.level)
  .setRank(0) // optional, if you have leaderboard system
  .setCurrentXP(userData.xp)
  .setRequiredXP(nextLevelXP)
  .setProgressBar({ fill: "#00FFFF", background: "#CCCCCC" })
  .setUsername(message.author.username)
  .setDiscriminator(message.author.discriminator || "0000")


if (background.startsWith("http"))
  rankCard.setBackground("image", background);
else if (background.startsWith("color"))
  rankCard.setBackground("color", background.split(":")[1]);

const rankImage = await rankCard.build({ format: "png" });
      
      
      const targetChannel = rankChannelData
        ? message.guild.channels.cache.get(rankChannelData.channelId) || message.channel
        : message.channel;

      await targetChannel.send({
        content: `🌈 ${message.author} leveled up to **Level ${userData.level}**!`,
        files: [{ attachment: rankImage, name: "rank-card.png" }],
      }).catch(() => {});

      // ✅ Role reward
      const reward = await LevelReward.findOne({ guildId, level: userData.level });
      if (reward) {
        const role = message.guild.roles.cache.get(reward.roleId);
        if (role && message.member) {
          await message.member.roles.add(role).catch(() => {});
          await targetChannel.send({
            embeds: [
              new EmbedBuilder()
                .setColor("Aqua")
                .setDescription(`🏅 ${message.author} earned the role ${role} for reaching Level ${userData.level}!`),
            ],
          }).catch(() => {});
        }
      }
    }

    await userData.save();

    // ---------- AFK Remove ----------
    if (client.afk.has(message.author.id)) {
      client.afk.delete(message.author.id);
      message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor("Green")
            .setDescription("✅ You are no longer AFK."),
        ],
      }).catch(() => {});
    }

    // ---------- AFK Mentions ----------
    if (message.mentions.users.size > 0) {
      message.mentions.users.forEach((user) => {
        if (client.afk.has(user.id)) {
          const data = client.afk.get(user.id);
          const since = `<t:${Math.floor(data.since / 1000)}:R>`;
          message.reply({
            embeds: [
              new EmbedBuilder()
                .setColor("Blue")
                .setTitle(`${user.tag} is AFK`)
                .setDescription(`✨ Reason: **${data.reason}**\nSince: ${since}`),
            ],
          }).catch(() => {});
        }
      });
    }

    // ---------- Chatbot System ----------
try {
  const config = await ChatBotConfig.findOne({ guildId: message.guild.id });
  if (config && message.channel.id === config.channelId && !message.author.bot) {
    // If message is in chatbot channel
    await message.channel.sendTyping();

    try {
      const model = ai.getGenerativeModel({ model: "gemini-2.0-flash" });
      const result = await model.generateContent(message.content);
      const replyText = result.response.text() || "🤖 ...";

      const chunks = replyText.match(/[\s\S]{1,1900}/g) || [];
      for (const chunk of chunks) {
        await message.reply(chunk);
      }
    } catch (err) {
      console.error("❌ Chatbot Error:", err);
      await message.reply("⚠️ I couldn’t reply this time. Try again later.").catch(() => {});
    }

    return; // stop other systems (autoresponse/prefix)
  }
} catch (err) {
  console.error("❌ Chatbot system failed:", err);
}
    // ---------- Autoresponse ----------
    try {
      const response = await getResponse(guildId, message.content);
      if (response) {
        await message.channel.send(response).catch(() => {});
        return;
      }
    } catch (err) {
      console.error("❌ Autoresponse failed:", err);
    }

    // ---------- Prefix Commands ----------
    const prefixes = getPrefixes();
    const guildPrefix = prefixes[guildId] || defaultPrefix;
    if (!message.content.startsWith(guildPrefix)) return;

    const args = message.content.slice(guildPrefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    const command = client.commands.get(commandName);
    if (!command) return;

    
    // ---------- Block Check ----------
    if (blockHelpers?.isBlocked && blockHelpers.isBlocked(guildId, message.author.id, commandName)) {
      return message.reply("🚫 You are blocked from using this command.");
    }

    // ---------- Ticket Prefix Command ----------
    if (commandName === "ticket") {
      await sendTicketPanel(message.channel);
      return message.reply("✅ Ticket panel sent!");
    }

    // ---------- Execute Prefix Command ----------
    try {
      if (typeof command.execute === "function") {
        // ✅ Unified format (same as interaction.js)
        await command.execute({
          client,
          message,
          interaction: null,
          args,
          isPrefix: true,
        });
      } else {
        message.reply("❌ This command cannot be used with a prefix.").catch(() => {});
      }
    } catch (err) {
      console.error(`❌ Prefix command execution failed: ${commandName}`, err);
      message.reply("❌ Something went wrong executing this command.").catch(() => {});
    }
  });
};
