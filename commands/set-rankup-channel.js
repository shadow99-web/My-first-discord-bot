const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const RankChannel = require("../models/RankChannel");

module.exports = {
  name: "setrankchannel",
  description: "Set or reset the rank-up message channel.",
  usage: "!setrankchannel <#channel> [backgroundURL] | !setrankchannel reset",

  // ================================
  // 💬 Slash Command
  // ================================
  data: new SlashCommandBuilder()
    .setName("setrankchannel")
    .setDescription("Set or reset the rank-up message channel.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub =>
      sub
        .setName("set")
        .setDescription("Set the rank-up channel and optional background.")
        .addChannelOption(opt =>
          opt
            .setName("channel")
            .setDescription("Rank-up channel")
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt
            .setName("background")
            .setDescription("Optional background image URL")
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName("reset")
        .setDescription("Reset rank-up channel & background")
    ),

  // ================================
  // ⚙️ Slash Execute
  // ================================
  async execute({ interaction }) {
    // 🔥 REQUIRED to prevent timeout
    await interaction.deferReply({ ephemeral: true });

    const sub = interaction.options.getSubcommand();

    // ----- SET -----
    if (sub === "set") {
      const channel = interaction.options.getChannel("channel");
      const background = interaction.options.getString("background");

      await RankChannel.findOneAndUpdate(
        { guildId: interaction.guild.id },
        {
          channelId: channel.id,
          background: background || null,
        },
        { upsert: true, new: true }
      );

      const embed = new EmbedBuilder()
        .setColor("Aqua")
        .setDescription(
          `✅ Rank-up messages will now be sent in ${channel}` +
          (background ? `\n Background set:\n${background}` : "")
        );

      return interaction.editReply({ embeds: [embed] });
    }

    // ----- RESET -----
    if (sub === "reset") {
      await RankChannel.findOneAndDelete({ guildId: interaction.guild.id });

      const embed = new EmbedBuilder()
        .setColor("Red")
        .setDescription("🔄 Rank-up settings have been reset.");

      return interaction.editReply({ embeds: [embed] });
    }
  },

  // ================================
  // 🧠 Prefix Execute
  // ================================
  async prefixExecute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return message.reply("❌ You don’t have permission to use this command.");
    }

    const sub = args[0]?.toLowerCase();

    if (!sub) {
      return message.reply(
        `Usage:\n\`${this.usage}\`\n\nExamples:\n` +
        `\`!setrankchannel #general https://imgur.com/bg.png\`\n` +
        `\`!setrankchannel reset\``
      );
    }

    // ----- RESET -----
    if (sub === "reset") {
      await RankChannel.findOneAndDelete({ guildId: message.guild.id });
      return message.reply("🔄 Rank-up settings have been reset.");
    }

    // ----- SET -----
    const channel = message.mentions.channels.first();
    if (!channel) {
      return message.reply("❌ Please mention a valid channel.");
    }

    const background = args[1] || null;

    await RankChannel.findOneAndUpdate(
      { guildId: message.guild.id },
      {
        channelId: channel.id,
        background,
      },
      { upsert: true, new: true }
    );

    const embed = new EmbedBuilder()
      .setColor("Aqua")
      .setDescription(
        `✅ Rank-up messages will now be sent in ${channel}` +
        (background ? `\n Background set:\n${background}` : "")
      );

    return message.reply({ embeds: [embed] });
  },
};
