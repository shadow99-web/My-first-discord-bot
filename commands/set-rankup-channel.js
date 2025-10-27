const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const RankChannel = require("../models/RankChannel");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("set-rankup-channel")
    .setDescription("Set the channel and optional background for rank-up messages.")
    .addSubcommand(sub =>
      sub
        .setName("set")
        .setDescription("Set the rank-up channel and optional background image")
        .addChannelOption(option =>
          option.setName("channel")
            .setDescription("Select the rank-up channel")
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName("background")
            .setDescription("Optional background image URL")
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName("reset")
        .setDescription("Reset the rank-up settings to default")
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute({ interaction }) {
    const sub = interaction.options.getSubcommand();

    if (sub === "set") {
      const channel = interaction.options.getChannel("channel");
      const background = interaction.options.getString("background");

      await RankChannel.findOneAndUpdate(
        { guildId: interaction.guild.id },
        {
          channelId: channel.id,
          backgroundURL: background || null, // ✅ added
        },
        { upsert: true, new: true }
      );

      const embed = new EmbedBuilder()
        .setColor("Aqua")
        .setDescription(
          `✅ Rank-up messages will now appear in ${channel}.${
            background ? `\n😍 Custom background set:\n${background}` : ""
          }`
        );

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (sub === "reset") {
      await RankChannel.findOneAndDelete({ guildId: interaction.guild.id });
      const embed = new EmbedBuilder()
        .setColor("Red")
        .setDescription("🤞🏻 Rank-up settings have been reset to default.");
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};
