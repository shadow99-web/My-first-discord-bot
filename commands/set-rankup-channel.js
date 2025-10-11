const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const RankChannel = require("../models/RankChannel");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("set-rankup-channel")
    .setDescription("Set the channel where rank-up messages will be sent.")
    .addChannelOption(option =>
      option.setName("channel")
        .setDescription("Select the rank-up channel")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute({ interaction }) {
    const channel = interaction.options.getChannel("channel");

    await RankChannel.findOneAndUpdate(
      { guildId: interaction.guild.id },
      { channelId: channel.id },
      { upsert: true, new: true }
    );

    const embed = new EmbedBuilder()
      .setColor("Aqua")
      .setDescription(`✅ Rank-up messages will now appear in ${channel}.`);

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
