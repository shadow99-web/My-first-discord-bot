const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder } = require("discord.js");
const ModLog = require("../models/ModLog");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("modlog")
    .setDescription("Setup or manage moderation logs.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName("setup")
        .setDescription("Set the moderation log channel.")
        .addChannelOption(opt =>
          opt.setName("channel")
            .setDescription("Select the channel where logs will be sent")
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText)
        )
    )
    .addSubcommand(sub =>
      sub.setName("disable")
        .setDescription("Disable the moderation log system")
    ),

  async execute({ interaction }) {
    const sub = interaction.options.getSubcommand();

    if (sub === "setup") {
      const channel = interaction.options.getChannel("channel");
      await ModLog.findOneAndUpdate(
        { guildId: interaction.guild.id },
        { channelId: channel.id },
        { upsert: true }
      );

      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor("Green")
            .setDescription(`✅ Mod-Log channel set to ${channel}`)
        ],
        ephemeral: true
      });
    }

    if (sub === "disable") {
      await ModLog.deleteOne({ guildId: interaction.guild.id });
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor("Red")
            .setDescription("🚫 Mod-Log system disabled.")
        ],
        ephemeral: true
      });
    }
  }
};
