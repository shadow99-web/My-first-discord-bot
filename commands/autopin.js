const {
  SlashCommandBuilder,
  PermissionFlagsBits,
} = require("discord.js");
const AutoPin = require("../models/AutoPin");
const { fetchRyzumiAPI } = require("../utils/ryzumi");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("autopost")
    .setDescription("📌 Auto-post  images")
    .addSubcommand(sc =>
      sc.setName("start")
        .setDescription("Start auto-posting images")
        .addStringOption(o =>
          o.setName("query")
            .setDescription("Pinterest search term")
            .setRequired(true)
        )
        .addIntegerOption(o =>
          o.setName("interval")
            .setDescription("Interval in minutes")
            .setRequired(true)
        )
        .addChannelOption(o =>
          o.setName("channel")
            .setDescription("Channel to auto-post into")
            .setRequired(true)
        )
    )
    .addSubcommand(sc =>
      sc.setName("stop")
        .setDescription("Stop auto-posting images")
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  name: "autopost",
  description: "📌 Auto-post  images (prefix + slash)",

  async execute(context) {
    const sub = context.isPrefix
      ? context.args[0]
      : context.interaction.options.getSubcommand();

    const guildId = context.guild.id;

    // Extract parameters (prefix mode)
    const args = context.isPrefix ? context.args.slice(1) : null;

    // ❌ Invalid usage (prefix)
    if (context.isPrefix && !["start", "stop"].includes(sub)) {
      return context.message.reply("❌ Usage: `autopin start <query> <interval> <#channel>` or `autopin stop`");
    }

    if (sub === "start") {
      // Get inputs
      const query = context.isPrefix
        ? args[0]
        : context.interaction.options.getString("query");

      const intervalMin = context.isPrefix
        ? Number(args[1])
        : context.interaction.options.getInteger("interval");

      const channel = context.isPrefix
        ? context.message.mentions.channels.first()
        : context.interaction.options.getChannel("channel");

      if (!query || !intervalMin || !channel)
        return context.reply("❌ Missing arguments.");

      const interval = intervalMin * 60 * 1000;

      // Save to DB
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

      const msg = `<a:purple_verified:1439271259190988954> **AutoPost Started**  
<a:heart2:1405233750484451338>: **${query}**  
<a:gold_butterfly:1439270586571558972>: **${intervalMin} minutes**  
<a:ANIMATEDARROWPINK:1407945915712671764>: ${channel}`;

      return context.isPrefix
        ? context.message.reply(msg)
        : context.interaction.reply(msg);
    }

    if (sub === "stop") {
      await AutoPin.deleteOne({ guildId });

      const msg = `<a:purple_verified:1439271259190988954> AutoPost stopped successfully.`;

      return context.isPrefix
        ? context.message.reply(msg)
        : context.interaction.reply(msg);
    }
  },
};
