const { 
  SlashCommandBuilder, 
  PermissionFlagsBits, 
  MessageFlags, 
  EmbedBuilder 
} = require("discord.js");
const WelcomeSettings = require("../models/WelcomeSettings.js");

module.exports = {
  // ---------- Command Info ----------
  name: "setwelcome",
  description: "Setup or reset the welcome card system (prefix + slash supported)",
  usage: "!setwelcome channel #channel [background]",

  // ---------- Slash Command Structure ----------
  data: new SlashCommandBuilder()
    .setName("setwelcome")
    .setDescription("Setup or reset the welcome card system")
    .addSubcommand(sub =>
      sub
        .setName("channel")
        .setDescription("Set the welcome channel and optional background")
        .addChannelOption(opt =>
          opt.setName("channel")
            .setDescription("Channel where welcome cards will be sent")
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName("background")
            .setDescription("Optional background image URL")
        )
    )
    .addSubcommand(sub =>
      sub
        .setName("reset")
        .setDescription("Reset welcome system for this server")
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  // ---------- Unified Execute (for both Slash and Prefix) ----------
  async execute({ client, interaction, message, args, isPrefix, safeReply }) {
    try {
      const guild = interaction?.guild || message?.guild;

      if (!guild) {
        const reply = "❌ This command can only be used inside a server.";
        return isPrefix ? message.reply(reply) : interaction.reply({ content: reply, flags: MessageFlags.Ephemeral });
      }

      const member = interaction?.member || message?.member;
      if (!member.permissions.has(PermissionFlagsBits.ManageGuild)) {
        const reply = "🚫 You need **Manage Server** permission to use this command.";
        return isPrefix ? message.reply(reply) : interaction.reply({ content: reply, flags: MessageFlags.Ephemeral });
      }

      // Detect mode: prefix sub or slash sub
      let sub;
      if (isPrefix) {
        sub = args[0];
      } else {
        sub = interaction.options.getSubcommand();
      }

      // Handle 'channel' subcommand
      if (sub === "channel") {
        let channel, bg;
        if (isPrefix) {
          channel = message.mentions.channels.first();
          bg = args[2] || null;
          if (!channel) return message.reply("❌ Please mention a valid channel.");
        } else {
          channel = interaction.options.getChannel("channel");
          bg = interaction.options.getString("background");
        }

        await WelcomeSettings.findOneAndUpdate(
          { guildId: guild.id },
          { channelId: channel.id, background: bg },
          { upsert: true, new: true }
        );

        const embed = new EmbedBuilder()
          .setColor("Green")
          .setTitle("✅ Welcome System Updated")
          .setDescription(
            `Welcome cards will now be sent in ${channel}${bg ? `
  Background: ${bg}` : ""}`
          );

        if (isPrefix) return message.reply({ embeds: [embed] });
        return interaction.reply({ embeds: [embed] });
      }

      // Handle 'reset' subcommand
      if (sub === "reset") {
        await WelcomeSettings.findOneAndDelete({ guildId: guild.id });

        const embed = new EmbedBuilder()
          .setColor("Orange")
          .setTitle("🧹 Welcome System Reset")
          .setDescription("The welcome system has been reset for this server.");

        if (isPrefix) return message.reply({ embeds: [embed] });
        return interaction.reply({ embeds: [embed] });
      }

      // Invalid usage
      if (isPrefix) {
        return message.reply("❓ Usage: `!setwelcome channel #channel [background]`");
      } else {
        return interaction.reply({
          content: "⚠️ Invalid subcommand. Use `/setwelcome channel` or `/setwelcome reset`.",
          flags: MessageFlags.Ephemeral,
        });
      }
    } catch (error) {
      console.error("❌ Error in setwelcome:", error);
      const reply = "⚠️ Something went wrong while updating the welcome system.";
      if (isPrefix) return message.reply(reply);
      return interaction.reply({ content: reply, flags: MessageFlags.Ephemeral });
    }
  },
};
