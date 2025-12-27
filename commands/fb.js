const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const FBFeed = require("../models/FacebookFeed");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("fb")
    .setDescription("Facebook RSS system")
    .addSubcommand(sub =>
      sub.setName("add")
        .setDescription("Add Facebook page RSS")
        .addStringOption(o =>
          o.setName("rss").setDescription("Facebook RSS URL").setRequired(true)
        )
        .addChannelOption(o =>
          o.setName("channel").setDescription("Post channel").setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName("remove").setDescription("Remove Facebook feed")
    ),

  async execute({ interaction, safeReply }) {
    const sub = interaction.options.getSubcommand();

    if (sub === "add") {
      const rss = interaction.options.getString("rss");
      const channel = interaction.options.getChannel("channel");

      await FBFeed.findOneAndUpdate(
        { guildId: interaction.guild.id },
        { rssUrl: rss, channelId: channel.id },
        { upsert: true }
      );

      return safeReply({
        embeds: [
          new EmbedBuilder()
            .setColor("Green")
            .setDescription(`✅ Facebook feed added\n➡ Posts → ${channel}`)
        ],
        ephemeral: true
      });
    }

    if (sub === "remove") {
      await FBFeed.deleteOne({ guildId: interaction.guild.id });
      return safeReply({ content: "🗑 Facebook feed removed", ephemeral: true });
    }
  },

  async prefixExecute(message, args) {
    const sub = args[0];

    if (!sub)
      return message.reply("Usage:\n`!fb add <rss> #channel`\n`!fb remove`");

    if (sub === "add") {
      const rss = args[1];
      const channel = message.mentions.channels.first();
      if (!rss || !channel) return message.reply("❌ Missing data");

      await FBFeed.findOneAndUpdate(
        { guildId: message.guild.id },
        { rssUrl: rss, channelId: channel.id },
        { upsert: true }
      );

      return message.reply(`✅ Facebook feed added → ${channel}`);
    }

    if (sub === "remove") {
      await FBFeed.deleteOne({ guildId: message.guild.id });
      return message.reply(" Facebook feed removed");
    }
  }
};
