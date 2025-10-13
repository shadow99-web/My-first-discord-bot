const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const RankSettings = require("../models/RankSettings");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("rankenable")
    .setDescription("Enable the rank system in this server.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  name: "rankenable",
  description: "Enable the rank system in this server.",
  permissions: [PermissionFlagsBits.ManageGuild],

  async execute(context) {
    const { interaction, message, isPrefix } = context;
    const guild = isPrefix ? message.guild : interaction.guild;
    const member = isPrefix ? message.member : interaction.member;

    // Permission check
    if (!member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      const embed = new EmbedBuilder()
        .setColor("Red")
        .setDescription("❌ You don’t have permission to manage this server.");
      return isPrefix
        ? message.reply({ embeds: [embed] })
        : interaction.reply({ embeds: [embed], ephemeral: true });
    }

    let settings = await RankSettings.findOne({ guildId: guild.id });
    if (!settings) settings = new RankSettings({ guildId: guild.id });

    settings.enabled = true;
    await settings.save();

    const embed = new EmbedBuilder()
      .setColor("Green")
      .setDescription("✅ Rank system has been **enabled** in this server.");

    return isPrefix
      ? message.reply({ embeds: [embed] })
      : interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
