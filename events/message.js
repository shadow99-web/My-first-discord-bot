const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const { getResponse } = require("../Handlers/autoresponseHandler");
const { sendTicketPanel } = require("../Handlers/ticketHandler");
const { defaultPrefix } = require("../utils/storage");
const ChatBotConfig = require("../models/chatbot");
const FakeOptions = require("../utils/fakeOptions");

const Anthropic = require("@anthropic-ai/sdk");
const anthropic = new Anthropic({
  apiKey: process.env.GEMINI_API_KEY,
});

const Level = require("../models/Level");
const LevelReward = require("../models/LevelReward");
const canvacord = require("canvacord");
const RankChannel = require("../models/RankChannel");
const RankSettings = require("../models/RankSettings");
const { getNoPrefix } = require("../Handlers/noPrefixHandler");

module.exports = function (client, getPrefixes, savePrefixes, blockHelpers) {
  client.on("messageCreate", async (message) => {
    if (!message.guild || message.author.bot) return;

    const guildId = message.guild.id;
  const userId = message.author.id;

    /* =======================================================
       🟢 STEP 1 — COMMAND DETECTION (DO NOT REMOVE)
    ======================================================= */
    const prefixes = getPrefixes?.() || {};
    const guildPrefix = prefixes[message.guild.id] || defaultPrefix || "!";
    const content = message.content.trim();

    const isPrefixed = content.startsWith(guildPrefix);
    const noPrefixEnabled = await getNoPrefix(message.guild.id);

    const isAdmin =
      message.member.permissions.has(PermissionFlagsBits.Administrator) ||
      message.guild.ownerId === message.author.id;

    const isNoPrefix = noPrefixEnabled && isAdmin;
    const isCommand = isPrefixed || isNoPrefix;

    let parsedCommand = null;
    let parsedArgs = null;

    if (isCommand) {
      parsedArgs = isPrefixed
        ? content.slice(guildPrefix.length).trim().split(/ +/)
        : content.split(/ +/);
const cmd = parsedArgs.shift();
parsedCommand = cmd ? cmd.toLowerCase() : null;
    }

    /* =======================================================
       🟡 XP + LEVEL SYSTEM
    ======================================================= */
    const rankSettings = await RankSettings.findOne({ guildId: message.guild.id });
const rankDisabled = rankSettings && rankSettings.enabled === false;

    if (!rankDisabled) {
  const xpGain = Math.floor(Math.random() * 10) + 5;
  
  let userData = await Level.findOne({ userId, guildId });
  if (!userData) {
    userData = await Level.create({ userId, guildId, xp: 0, level: 0 });
  }

  userData.xp += xpGain;
  const nextLevelXP = 100 + userData.level * 50;

  if (userData.xp >= nextLevelXP) {
    userData.level += 1;
    userData.xp -= nextLevelXP;

      const rankChannelData = await RankChannel.findOne({ guildId });
      const background =
        rankChannelData?.background || "color:#F2F3F5";

      const rank = new canvacord.Rank()
        .setAvatar(message.author.displayAvatarURL({ extension: "png", size: 256 }))
        .setUsername(message.author.username || "Unknown")
        .setLevel(userData.level)
        .setCurrentXP(userData.xp)
        .setRequiredXP(nextLevelXP)
        .setRank(0)
        .setProgressBar("#00FFFF");

      if (background.startsWith("http")) {
        rank.setBackground("IMAGE", background);
      } else {
        rank.setBackground("COLOR", background.split(":")[1]);
      }

      const rankImage = await rank.build({ format: "png" });
      const targetChannel =
        message.guild.channels.cache.get(rankChannelData?.channelId) ||
        message.channel;

      await targetChannel.send({
        content: `<a:lyf_party:1447282086368251974> ${message.author} leveled up to **Level ${userData.level}** GG !!`,
        files: [{ attachment: rankImage, name: "rank-card.png" }],
      }).catch(() => {});
    }

    await userData.save();
    }
    /* =======================================================
       🔵 AFK SYSTEM
    ======================================================= */
    if (client.afk.has(message.author.id)) {
      client.afk.delete(message.author.id);
      message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor("Green")
            .setDescription("<a:5756_YeetusDeletusDance:1433125435327254698> You are no longer AFK."),
        ],
      }).catch(() => {});
    }

    if (message.mentions.users.size > 0) {
      message.mentions.users.forEach((user) => {
        if (client.afk.has(user.id)) {
          const data = client.afk.get(user.id);
          message.reply({
            embeds: [
              new EmbedBuilder()
                .setColor("Blue")
                .setTitle(`<a:presence_single:1439950517651640415> ${user.tag} is AFK`)
                .setDescription(`Reason: **${data.reason}**`),
            ],
          }).catch(() => {});
        }
      });
    }

    /* =======================================================
       🤖 CHATBOT SYSTEM
    ======================================================= */
    try {
      const config = await ChatBotConfig.findOne({ guildId });
      if (config && message.channel.id === config.channelId) {
        await message.channel.sendTyping();
        const msg = await anthropic.messages.create({
          model: "claude-3-5-sonnet-20240620",
          max_tokens: 500,
          messages: [{ role: "user", content: message.content }],
        });
        await message.reply(msg.content?.[0]?.text || "🤖 ...");
      
      }
    } catch (e) {
      console.error("❌ Chatbot Error:", e);
    }

    /* =======================================================
       🟣 AUTORESPONSE (SKIP COMMANDS)
    ======================================================= */
    try {
      if (!isCommand) {
        const response = await getResponse(guildId, message.content);
        if (response) {
          await message.channel.send(response);
        }
      }
    } catch {}

/* =======================================================
   📌 STICKY MESSAGE SYSTEM (SAFE)
======================================================= */
try {
  if (!isCommand) {
    if (message.author.id === client.user.id) return; // ✅ FIX

    const { getSticky } = require("../utils/stickyHelpers");
    const sticky = await getSticky(message.channel.id);
    if (sticky) {
      if (sticky.lastMessageId) {
        const oldMsg = await message.channel.messages
          .fetch(sticky.lastMessageId)
          .catch(() => null);
        if (oldMsg) await oldMsg.delete().catch(() => {});
      }

      const sent = await message.channel.send({
        content: `<a:dot:1456901127890141290> **__Sticky Message__**\n${sticky.message}`,
      });

      sticky.lastMessageId = sent.id;
      await sticky.save();
    }
  }
} catch (err) {
  console.error("❌ Sticky system error:", err);
}

    /* =======================================================
       🔴 COMMAND EXECUTION
    ======================================================= */
    try {
      if (!isCommand || !parsedCommand) return;

      const command = client.commands.get(parsedCommand);
      if (!command) return;

      const fakeInteraction = {
  isFake: true,
  guild: message.guild,
  channel: message.channel,
  user: message.author,
  member: message.member,
  client: message.client,
  replied: false,
  createdTimestamp: message.createdTimestamp, // needed for ping latency
  options: new FakeOptions(parsedArgs, message),

  // Reply to the message
  reply: async (payload) => {
    fakeInteraction.replied = true;
    return message.reply(payload);
  },

  // Defer reply (like interaction.deferReply())
  deferReply: async () => {
    fakeInteraction.replied = true;
    // optional: could send a typing indicator
    await message.channel.sendTyping();
    return;
  },

  // Edit reply (like interaction.editReply())
  editReply: async (payload) => {
    // safest: just reply for now
    return message.reply(payload);
  },

  // For ping commands or other that use interaction.fetchReply()
  fetchReply: async () => ({
  createdTimestamp: Date.now(),
}),

  // In case some commands check if it is a DM or guild
  isCommand: true,
};
      const isBlocked = await blockHelpers.isBlocked({
        guildId,
        userId,
        command: parsedCommand,
        member: message.member,
      });

      if (isBlocked) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor("Red")
              .setTitle("🚫 Command Blocked")
              .setDescription(`You are blocked from using **${parsedCommand}**.`),
          ],
        });
      }

      await command.execute({
        client,
        message,
        interaction: fakeInteraction,
        safeReply: (p) => message.reply(p),
        args: parsedArgs,
        isPrefix: isPrefixed,
      });
    } catch (err) {
      console.error("❌ Command Error:", err);
    }
  });
};
