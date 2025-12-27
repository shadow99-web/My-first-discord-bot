const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder
} = require("discord.js");
const FBFeed = require("../models/FacebookFeed");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("fb")
    .setDescription("Facebook auto-post system")
    .addSubcommand(sub =>
      sub.setName("add")
        .setDescription("Add Facebook RSS feed")
        .addStringOption(o =>
          o.setName("rss")
            .setDescription("Facebook RSS link")
            .setRequired(true)
        )
        .addChannelOption(o =>
          o.setName("channel")
            .setDescription("Channel to post in")
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName("remove")
        .setDescription("Remove Facebook feed")
    ),

  async execute({ interaction }) {
    const sub = interaction.options.getSubcommand();

    if (sub === "add") {
      const rss = interaction.options.getString("rss");
      const channel = interaction.options.getChannel("channel");

      await FBFeed.findOneAndUpdate(
        { guildId: interaction.guild.id },
        {
          rssUrl: rss,
          channelId: channel.id
        },
        { upsert: true }
      );

      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor("Green")
            .setDescription(`✅ Facebook feed added!\nPosts will be sent to ${channel}`)
        ],
        ephemeral: true
      });
    }

    if (sub === "remove") {
      await FBFeed.deleteOne({ guildId: interaction.guild.id });

      await interaction.reply({
        content: " Facebook feed removed.",
        ephemeral: true
      });
    }
  }
};
