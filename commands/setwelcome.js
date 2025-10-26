const { 
  SlashCommandBuilder, 
  PermissionFlagsBits, 
  MessageFlags 
} = require("discord.js");
const WelcomeSettings = require("../models/WelcomeSettings.js");

module.exports = {
  // -------- SLASH COMMAND STRUCTURE --------
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

  // -------- HYBRID SUPPORT METADATA --------
  name: "setwelcome",
  description: "Setup or reset the welcome card system (prefix + slash supported)",
  usage: "!setwelcome channel #channel [background]",

  // -------- PREFIX COMMAND EXECUTION --------
  async execute(ctx) {
    const message = ctx.message;
    const args = ctx.args;

    if (!message?.guild) {
      return message.reply("❌ This command can only be used inside a server.");
    }

    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return message.reply("🚫 You need **Manage Server** permission to use this command.");
    }

    const sub = args[0];

    if (sub === "channel") {
      const channel = message.mentions.channels.first();
      const bg = args[2] || null;

      if (!channel) return message.reply("❌ Please mention a valid channel.");

      await WelcomeSettings.findOneAndUpdate(
        { guildId: message.guild.id },
        { channelId: channel.id, background: bg },
        { upsert: true, new: true }
      );

      return message.reply(
        `✅ Welcome system set to ${channel} ${bg ? `with background: ${bg}` : ""}`
      );
    }

    if (sub === "reset") {
      await WelcomeSettings.findOneAndDelete({ guildId: message.guild.id });
      return message.reply("🧹 Welcome system has been reset.");
    }

    return message.reply("❓ Usage: `!setwelcome channel #channel [background]`");
  },

  // -------- SLASH COMMAND EXECUTION --------
  async runSlash(interaction) {
    if (!interaction.inGuild()) {
      return interaction.reply({
        content: "❌ This command can only be used in a server.",
        flags: MessageFlags.Ephemeral, // Replaces deprecated 'ephemeral'
      });
    }

    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({
        content: "🚫 You need **Manage Server** permission to use this command.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const sub = interaction.options.getSubcommand();

    if (sub === "channel") {
      const channel = interaction.options.getChannel("channel");
      const bg = interaction.options.getString("background");

      await WelcomeSettings.findOneAndUpdate(
        { guildId: interaction.guild.id },
        { channelId: channel.id, background: bg },
        { upsert: true, new: true }
      );

      return interaction.reply({
        content: `✅ Welcome system set to ${channel} ${bg ? `with background: ${bg}` : ""}`,
      });
    }

    if (sub === "reset") {
      await WelcomeSettings.findOneAndDelete({ guildId: interaction.guild.id });
      return interaction.reply({
        content: "🧹 Welcome system has been reset.",
      });
    }
  },
};
