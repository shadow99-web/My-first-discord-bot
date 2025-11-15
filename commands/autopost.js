const {
  SlashCommandBuilder,
  PermissionFlagsBits,
} = require("discord.js");
const AutoPin = require("../models/AutoPin");
const { fetchRyzumiAPI } = require("../utils/ryzumi");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("autopost")
    .setDescription(" Auto-post images")
    .addSubcommand(sc =>
      sc.setName("start")
        .setDescription("Start auto-posting images")
        .addStringOption(o =>
          o.setName("query")
            .setDescription("images u want for to autopost")
            .setRequired(true)
        )
        .addIntegerOption(o =>
          o.setName("interval")
            .setDescription("Interval in minutes")
            .setRequired(true)
        )
        .addChannelOption(o =>
          o.setName("channel")
            .setDescription("Channel to post in")
            .setRequired(true)
        )
    )
    .addSubcommand(sc =>
      sc.setName("stop")
        .setDescription("Stop auto-posting images")
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  name: "autopost",
  description: "📌 Auto-post images (prefix + slash)",

  async execute(context) {
    // Detect subcommand
    const sub = context.isPrefix
      ? context.args[0]
      : context.interaction.options.getSubcommand();

    // ⭐ FIXED: Auto-detect guild safely
    const guildId = context.isPrefix
      ? context.message.guild.id
      : context.interaction.guild.id;

    // Prefix arguments
    const args = context.isPrefix ? context.args.slice(1) : null;

    // ❌ Invalid prefix usage
    if (context.isPrefix && !["start", "stop"].includes(sub)) {
      return context.message.reply(
        "❌ Usage: `autopost start <query> <interval> <#channel>` or `autopost stop`"
      );
    }

    // ================================
    // START AUTOPOST
    // ================================
    if (sub === "start") {
      const query = context.isPrefix
        ? args[0]
        : context.interaction.options.getString("query");

      const intervalMin = context.isPrefix
        ? Number(args[1])
        : context.interaction.options.getInteger("interval");

      const channel = context.isPrefix
        ? context.message.mentions.channels.first()
        : context.interaction.options.getChannel("channel");

      if (!query || !intervalMin || !channel) {
        return context.isPrefix
          ? context.message.reply("❌ Missing arguments.")
          : context.interaction.reply("❌ Missing arguments.");
      }

      const interval = intervalMin * 60 * 1000;

      // Save to database
      await AutoPin.findOneAndUpdate(
        { guildId },
        {
          guildId,
          channelId: channel.id,
          query,
          interval,
          lastPost: 0,
        },
        { upsert: true }
      );

      const msg =
        `<a:purple_verified:1439271259190988954> **AutoPost Started**\n` +
        `<a:heart2:1405233750484451338> Query: **${query}**\n` +
        `<a:gold_butterfly:1439270586571558972> Interval: **${intervalMin} minutes**\n` +
        `<a:ANIMATEDARROWPINK:1407945915712671764> Channel: ${channel}`;

      return context.isPrefix
        ? context.message.reply(msg)
        : context.interaction.reply(msg);
    }

    // ================================
    // STOP AUTOPOST
    // ================================
    if (sub === "stop") {
      await AutoPin.deleteOne({ guildId });

      const msg = `<a:purple_verified:1439271259190988954> AutoPost stopped successfully.`;

      return context.isPrefix
        ? context.message.reply(msg)
        : context.interaction.reply(msg);
    }
  },
};
