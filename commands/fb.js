const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const FBFeed = require("../models/FacebookFeed");
const axios = require("axios");

module.exports = {
  name: "fb",
  description: "Facebook auto-post system",

  data: new SlashCommandBuilder()
    .setName("fb")
    .setDescription("Facebook auto-post system")
    .addSubcommand(sub =>
      sub.setName("add")
        .setDescription("Add a Facebook page to auto-post")
        .addStringOption(opt =>
          opt.setName("page")
            .setDescription("Facebook page ID or username")
            .setRequired(true)
        )
        .addChannelOption(opt =>
          opt.setName("channel")
            .setDescription("Channel to post in")
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName("remove")
        .setDescription("Remove Facebook feed from server")
    ),

  async execute({ interaction, message, safeReply, args, isPrefix, client }) {
    const isSlash = !!interaction;

    // Determine subcommand
    let sub = isSlash ? interaction.options.getSubcommand() : args?.[0];
    if (!sub) {
      return safeReply({
        content: "Usage:\n`!fb add <page> #channel`\n`!fb remove`",
      });
    }

    // ---------- ADD ----------
    if (sub === "add") {
      const pageId = isSlash ? interaction.options.getString("page") : args[1];
      const channel = isSlash ? interaction.options.getChannel("channel") : message.mentions.channels.first();
      if (!pageId || !channel) {
        return safeReply({ content: "❌ Missing page ID or channel." });
      }

      await FBFeed.findOneAndUpdate(
        { guildId: (isSlash ? interaction.guild.id : message.guild.id), pageId },
        {
          guildId: isSlash ? interaction.guild.id : message.guild.id,
          pageId,
          channelId: channel.id,
          lastPostId: null
        },
        { upsert: true }
      );

      return safeReply({
        embeds: [
          new EmbedBuilder()
            .setColor("Green")
            .setDescription(`✅ Facebook feed added!\nPosts from **${pageId}** will be sent to ${channel}`)
        ],
      });
    }

    // ---------- REMOVE ----------
    if (sub === "remove") {
      await FBFeed.deleteMany({ guildId: isSlash ? interaction.guild.id : message.guild.id });
      return safeReply({ content: "🗑️ All Facebook feeds removed for this server." });
    }
  },

  // ---------- Prefix execution ----------
  async prefixExecute(message, args, safeReply) {
    return this.execute({ message, args, isPrefix: true, safeReply });
  }
};
