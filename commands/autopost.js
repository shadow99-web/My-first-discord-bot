const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} = require("discord.js");

const AutoPin = require("../models/AutoPin");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("autopost")
    .setDescription(" Auto-post images")
    .addSubcommand(sc =>
      sc.setName("start")
        .setDescription("Start an autopost task")
        .addStringOption(o =>
          o.setName("query")
            .setDescription("Images search term")
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
        .setDescription("Stop an autopost task")
        .addIntegerOption(o =>
          o.setName("id")
            .setDescription("Task ID to stop")
            .setRequired(true)
        )
    )
    .addSubcommand(sc =>
      sc.setName("config")
        .setDescription("Show all autopost tasks")
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  name: "autopost",

  async execute(context) {
    const sub = context.isPrefix
      ? context.args[0]
      : context.interaction.options.getSubcommand();

    const guildId = context.isPrefix
      ? context.message.guild.id
      : context.interaction.guild.id;

    // ===========================
    // START AUTPOST TASK
    // ===========================
    if (sub === "start") {
      const query = context.isPrefix ? context.args[1] : context.interaction.options.getString("query");
      const intervalMin = context.isPrefix ? Number(context.args[2]) : context.interaction.options.getInteger("interval");
      const channel = context.isPrefix
        ? context.message.mentions.channels.first()
        : context.interaction.options.getChannel("channel");

      const interval = intervalMin * 60000;

      // Count tasks in this server
      const tasks = await AutoPin.find({ guildId });

      if (tasks.length >= 3) {
        const msg = "<a:alert:1439611767302127788> This server already has **3 autopost tasks**. Remove one using `/autopost stop <id>`.";
        return context.isPrefix ? context.message.reply(msg) : context.interaction.reply(msg);
      }

      // Determine next available task ID
      const nextId = tasks.length === 0 ? 1 : Math.max(...tasks.map(t => t.taskId)) + 1;

      await AutoPin.create({
        guildId,
        taskId: nextId,
        channelId: channel.id,
        query,
        interval,
        lastPost: 0,
      });

      const msg =
        `<a:purple_verified:1439271259190988954> **Autopost Task Created (#${nextId})**\n` +
        `<a:heart2:1405233750484451338> Query: **${query}**\n` +
        `<a:gold_butterfly:1439270586571558972> Interval: **${intervalMin} minutes**\n` +
        `<a:animatedarrowpink:1439271011299360788> Channel: ${channel}`;

      return context.isPrefix
        ? context.message.reply(msg)
        : context.interaction.reply(msg);
    }

    // ===========================
    // STOP TASK
    // ===========================
    if (sub === "stop") {
      const id = context.isPrefix ? Number(context.args[1]) : context.interaction.options.getInteger("id");

      const task = await AutoPin.findOne({ guildId, taskId: id });

      if (!task) {
        const msg = `❌ No autopost task found with ID **${id}**.`;
        return context.isPrefix ? context.message.reply(msg) : context.interaction.reply(msg);
      }

      await AutoPin.deleteOne({ guildId, taskId: id });

      const msg = `<a:purple_verified:1439271259190988954> Autopost Task #${id} has been stopped.`;

      return context.isPrefix
        ? context.message.reply(msg)
        : context.interaction.reply(msg);
    }

    // ===========================
    // CONFIG
    // ===========================
    if (sub === "config") {
      const tasks = await AutoPin.find({ guildId });

      if (tasks.length === 0) {
        const msg = "❌ No autopost tasks found in this server.";
        return context.isPrefix ? context.message.reply(msg) : context.interaction.reply(msg);
      }

      const embed = new EmbedBuilder()
        .setTitle("`<a:gold_butterfly:1439270586571558972> Autopost Configuration")
        .setColor("Aqua");

      tasks.forEach(t => {
        embed.addFields({
          name: `Task #${t.taskId}`,
          value:
            `<a:heart2:1405233750484451338> **Query:** ${t.query}\n` +
            `<a:gold_butterfly:1439270586571558972> **Interval:** ${t.interval / 60000} min\n` +
            `<a:Gem:1424787118278049813> **Channel:** <#${t.channelId}>\n` +
            `<a:hehehe:1401554249455898716> **Last Post:** ${t.lastPost === 0 ? "Not yet" : `<t:${Math.floor(t.lastPost / 1000)}:R>`}`,
          inline: false,
        });
      });

      return context.isPrefix
        ? context.message.reply({ embeds: [embed] })
        : context.interaction.reply({ embeds: [embed] });
    }
  },
};
