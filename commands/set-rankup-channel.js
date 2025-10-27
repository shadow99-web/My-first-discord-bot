const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const RankChannel = require("../models/RankChannel");

module.exports = {
  name: "setrankupchannel",
  description: "Set or reset the rank-up message channel.",
  usage: "!setrankupchannel <#channel> [backgroundURL] or !setrankupchannel reset",

  // ================================
  // 💬 Slash Command Builder
  // ================================
  data: new SlashCommandBuilder()
    .setName("set-rankup-channel")
    .setDescription("Set or reset the rank-up message channel.")
    .addSubcommand(sub =>
      sub
        .setName("set")
        .setDescription("Set the rank-up channel and optional background image.")
        .addChannelOption(option =>
          option
            .setName("channel")
            .setDescription("Select the rank-up channel.")
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName("background")
            .setDescription("Optional background image URL.")
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName("reset")
        .setDescription("Reset the rank-up settings to default.")
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  // ================================
  // ⚙️ Slash Command Execute
  // ================================
  async execute({ interaction }) {
    const sub = interaction.options.getSubcommand();

    if (sub === "set") {
      const channel = interaction.options.getChannel("channel");
      const background = interaction.options.getString("background");

      await RankChannel.findOneAndUpdate(
        { guildId: interaction.guild.id },
        { channelId: channel.id, background: background || null },
        { upsert: true, new: true }
      );

      const embed = new EmbedBuilder()
        .setColor("Aqua")
        .setDescription(
          `✅ Rank-up messages will now appear in ${channel}.${
            background ? `\n🎨 Custom background set:\n${background}` : ""
          }`
        );

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (sub === "reset") {
      await RankChannel.findOneAndDelete({ guildId: interaction.guild.id });

      const embed = new EmbedBuilder()
        .setColor("Red")
        .setDescription("🔄 Rank-up settings have been reset to default.");

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },

  // ================================
  // 🧠 Prefix Command Execute
  // ================================
  async prefixExecute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return message.reply("❌ You don’t have permission to use this command.");
    }

    const sub = args[0];

    if (!sub)
      return message.reply(
        `Usage:\n\`${this.usage}\`\nExample:\n!setrankupchannel #general https://imgur.com/bg.png\n!setrankupchannel reset`
      );

    // ----- RESET -----
    if (sub.toLowerCase() === "reset") {
      await RankChannel.findOneAndDelete({ guildId: message.guild.id });
      return message.reply("🔄 Rank-up settings have been reset to default.");
    }

    // ----- SET -----
    const channel = message.mentions.channels.first();
    if (!channel)
      return message.reply("❌ Please mention a valid channel.");

    const background = args[1] || null;

    await RankChannel.findOneAndUpdate(
      { guildId: message.guild.id },
      { channelId: channel.id, background },
      { upsert: true, new: true }
    );

    const embed = new EmbedBuilder()
      .setColor("Aqua")
      .setDescription(
        `✅ Rank-up messages will now appear in ${channel}.${
          background ? `\n🎨 Custom background set:\n${background}` : ""
        }`
      );

    return message.reply({ embeds: [embed] });
  },
};
