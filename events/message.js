const { EmbedBuilder } = require("discord.js");
const { getResponse } = require("../Handlers/autoresponseHandler");
const { sendTicketPanel } = require("../Handlers/ticketHandler");
const { defaultPrefix } = require("../utils/storage");
const ChatBotConfig = require("../models/chatbot");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const Level = require("../models/Level");
const LevelReward = require("../models/LevelReward");
const canvacord = require("canvacord");
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
// … inside your “if (user leveled up)” block …

const rankChannelData = await RankChannel.findOne({ guildId });
const background =
  (rankChannelData && rankChannelData.background)
    ? rankChannelData.background
    : "color:#F2F3F5";

// Provide safe fallback for username + discriminator
const safeUsername = message.author.username || "Unknown";
const safeDiscriminator =
  typeof message.author.discriminator === "string" &&
  /^[0-9]{4}$/.test(message.author.discriminator)
    ? message.author.discriminator
    : "0000";

const rank = new canvacord.Rank()
  .setAvatar(message.author.displayAvatarURL({ extension: "png", size: 256 }))
  .setUsername(safeUsername)
  .setDiscriminator(safeDiscriminator)
  .setLevel(userData.level)
  .setCurrentXP(userData.xp)
  .setRequiredXP(nextLevelXP)
  .setRank(0) // if no leaderboard position
  .setProgressBar("#00FFFF");  // string only

if (background.startsWith("http")) {
  rank.setBackground("IMAGE", background);
} else if (background.startsWith("color")) {
  rank.setBackground("COLOR", background.split(":")[1]);
}

const rankImage = await rank.build({ format: "png" });

const targetChannel = rankChannelData
  ? message.guild.channels.cache.get(rankChannelData.channelId) || message.channel
  : message.channel;

await targetChannel.send({
  content: `<a:5756_YeetusDeletusDance:1433125435327254698>  ${message.author} leveled up to **Level ${userData.level}**!`,
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
            .setDescription(" <a:5756_YeetusDeletusDance:1433125435327254698> You are no longer AFK."),
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
                .setTitle(`<a:presence_single:1439950517651640415> ${user.tag} is AFK`)
                .setDescription(`<a:Gem:1424787118278049813> Reason: **${data.reason}**\nSince: ${since}`),
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
try {
  // Always safe – prevents undefined errors
  const prefixes = getPrefixes?.() || {};
  const guildPrefix = prefixes[message.guild.id] || defaultPrefix || "!";

  // Ignore messages without prefix
  if (!message.content.startsWith(guildPrefix)) return;

  // Slice command + args
  const args = message.content.slice(guildPrefix.length).trim().split(/ +/);
  const commandName = args.shift()?.toLowerCase();
  if (!commandName) return;

  // Fetch command
  const command = client.commands.get(commandName);
  if (!command) return;

  // Optional: Block system check
  if (
    blockHelpers?.isBlocked &&
    blockHelpers.isBlocked(message.guild.id, message.author.id, commandName)
  ) {
    return message.reply("🚫 You are blocked from using this command.");
  }

  // Execute command
  if (typeof command.execute === "function") {
    await command.execute({
      client,
      message,
      interaction: null,
      args,
      isPrefix: true,
    });
  } else {
    await message.reply("❌ This command cannot be used with a prefix.").catch(() => {});
  }
} catch (err) {
  console.error("❌ Prefix Command Error:", err);
  await message.reply("⚠️ Something went wrong executing this prefix command.").catch(() => {});
}
  });
};
