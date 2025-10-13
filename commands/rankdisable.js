const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const RankSettings = require("../models/RankSettings");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("rankdisable")
    .setDescription("Disable the rank system in this server.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute({ interaction, isPrefix, message }) {
    const guildId = isPrefix ? message.guild.id : interaction.guild.id;

    let settings = await RankSettings.findOne({ guildId });
    if (!settings) settings = new RankSettings({ guildId });

    settings.enabled = false;
    await settings.save();

    const embed = new EmbedBuilder()
      .setColor("Red")
      .setDescription("🛑 Rank system has been **disabled** in this server.");

    if (isPrefix) await message.reply({ embeds: [embed] });
    else await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
