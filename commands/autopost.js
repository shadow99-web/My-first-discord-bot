const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
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
            .setDescription("Images search term for autoposting")
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
    .addSubcommand(sc =>
      sc.setName("config")
        .setDescription("Show current autopost configuration")
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  name: "autopost",
  description: "📌 Auto-post images (prefix + slash)",

  async execute(context) {
    const sub = context.isPrefix
      ? context.args[0]
      : context.interaction.options.getSubcommand();

    const guildId = context.isPrefix
      ? context.message.guild.id
      : context.interaction.guild.id;

    const args = context.isPrefix ? context.args.slice(1) : null;

    // ❌ Invalid prefix usage
    if (context.isPrefix && !["start", "stop", "config"].includes(sub)) {
      return context.message.reply(
        "❌ Usage:\n" +
        "`autopost start <query> <interval> <#channel>`\n" +
        "`autopost stop`\n" +
        "`autopost config`"
      );
    }

    // ================================
    // START
    // ================================
    if (sub === "start") {
      const query = context.isPrefix ? args[0] : context.interaction.options.getString("query");
      const intervalMin = context.isPrefix ? Number(args[1]) : context.interaction.options.getInteger("interval");
      const channel = context.isPrefix
        ? context.message.mentions.channels.first()
        : context.interaction.options.getChannel("channel");

      if (!query || !intervalMin || !channel) {
        const replyText = "❌ Missing arguments.";
        return context.isPrefix ? context.message.reply(replyText) : context.interaction.reply(replyText);
      }

      const interval = intervalMin * 60 * 1000;

      await AutoPin.findOneAndUpdate(
        { guildId },
        { guildId, channelId: channel.id, query, interval, lastPost: 0 },
        { upsert: true }
      );

      const msg =
        `<a:purple_verified:1439271259190988954> **AutoPost Started**\n` +
        `<a:heart2:1405233750484451338> Query: **${query}**\n` +
        `<a:gold_butterfly:1439270586571558972> Interval: **${intervalMin} minutes**\n` +
        `<a:animatedarrowpink:1439271011299360788> Channel: ${channel}`;

      return context.isPrefix
        ? context.message.reply(msg)
        : context.interaction.reply(msg);
    }

    // ================================
    // STOP
    // ================================
    if (sub === "stop") {
      await AutoPin.deleteOne({ guildId });

      const msg = `<a:purple_verified:1439271259190988954> AutoPost stopped successfully.`;

      return context.isPrefix
        ? context.message.reply(msg)
        : context.interaction.reply(msg);
    }

    // ================================
    // CONFIG
    // ================================
    if (sub === "config") {
      const data = await AutoPin.findOne({ guildId });

      if (!data) {
        const reply = "❌ No autopost config found for this server.";
        return context.isPrefix ? context.message.reply(reply) : context.interaction.reply(reply);
      }

      const embed = new EmbedBuilder()
        .setTitle("📌 AutoPost Configuration")
        .setColor("Aqua")
        .addFields(
          { name: "Query", value: data.query, inline: true },
          { name: "Interval", value: `${data.interval / 60000} minutes`, inline: true },
          { name: "Channel", value: `<#${data.channelId}>`, inline: true },
          {
            name: "Last Posted",
            value: data.lastPost === 0
              ? "Not yet posted"
              : `<t:${Math.floor(data.lastPost / 1000)}:R>`,
            inline: true
          },
          {
            name: "Status",
            value: data ? " <a:heart2:1405233750484451338> **Enabled**" : "<:reddot:1430434996707000391> Disabled",
            inline: true
          }
        )
        .setTimestamp();

      return context.isPrefix
        ? context.message.reply({ embeds: [embed] })
        : context.interaction.reply({ embeds: [embed] });
    }
  },
};
