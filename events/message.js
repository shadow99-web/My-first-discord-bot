// events/message.js
const { EmbedBuilder } = require("discord.js");
const { getResponse } = require("../Handlers/autoresponseHandler");
const { sendTicketPanel } = require("../Handlers/ticketHandler");
const { defaultPrefix } = require("../utils/storage");
const Level = require("../models/Level");
const LevelReward = require("../models/LevelReward");

module.exports = function (client, getPrefixes, blockHelpers) {
  client.on("messageCreate", async (message) => {
    if (!message.guild || message.author.bot) return;
// ---------- XP + Level System ----------
    const xpGain = Math.floor(Math.random() * 10) + 5; // 5–15 XP per message
    const guildId = message.guild.id;
    const userId = message.author.id;

    let userData = await UserXP.findOne({ userId, guildId });
    if (!userData) {
      userData = await UserXP.create({ userId, guildId, xp: 0, level: 0 });
    }

    userData.xp += xpGain;

    // Formula for XP needed to level up (customizable)
    const nextLevelXP = 100 + userData.level * 50;

    // If user leveled up
    if (userData.xp >= nextLevelXP) {
      userData.level += 1;
      userData.xp = 0;

      await message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor("Gold")
            .setDescription(`🤞🏻 ${message.author} leveled up to **Level ${userData.level}**!`),
        ],
      }).catch(() => {});

      // ✅ Check for role rewards
      const reward = await LevelReward.findOne({
        guildId,
        level: userData.level,
      });

      if (reward) {
        const role = message.guild.roles.cache.get(reward.roleId);
        if (role && message.member) {
          await message.member.roles.add(role).catch(() => {});
          await message.channel.send({
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
