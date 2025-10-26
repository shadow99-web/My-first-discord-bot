const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const WelcomeSettings = require("../models/WelcomeSettings.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setwelcome")
    .setDescription("Setup or reset the welcome system")
    .addSubcommand(sub =>
      sub
        .setName("channel")
        .setDescription("Set welcome channel and optional background")
        .addChannelOption(opt =>
          opt.setName("channel").setDescription("Channel to send welcome cards").setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName("background").setDescription("Optional background image URL")
        )
    )
    .addSubcommand(sub =>
      sub
        .setName("reset")
        .setDescription("Reset welcome system for this server")
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  name: "setwelcome",
  description: "Setup or reset the welcome system (prefix supported)",
  usage: "!setwelcome channel #channel [background]",

  async execute(message, args, client) {
    if (!message.member.permissions.has("ManageGuild")) {
      return message.reply("❌ You need **Manage Server** permission to use this command.");
    }

    const sub = args[0];
    if (sub === "channel") {
      const channel = message.mentions.channels.first();
      const bg = args[2] || null;

      if (!channel) return message.reply("Please mention a valid channel.");

      await WelcomeSettings.findOneAndUpdate(
        { guildId: message.guild.id },
        { channelId: channel.id, background: bg },
        { upsert: true }
      );

      return message.reply(
        `✅ Welcome system set to ${channel} ${bg ? `with background: ${bg}` : ""}`
      );
    } else if (sub === "reset") {
      await WelcomeSettings.findOneAndDelete({ guildId: message.guild.id });
      return message.reply("🧹 Welcome system has been reset.");
    }
  },

  async runSlash(interaction) {
    const sub = interaction.options.getSubcommand();
    if (sub === "channel") {
      const channel = interaction.options.getChannel("channel");
      const bg = interaction.options.getString("background");

      await WelcomeSettings.findOneAndUpdate(
        { guildId: interaction.guild.id },
        { channelId: channel.id, background: bg },
        { upsert: true }
      );

      await interaction.reply(
        `✅ Welcome system set to ${channel} ${bg ? `with background: ${bg}` : ""}`
      );
    } else if (sub === "reset") {
      await WelcomeSettings.findOneAndDelete({ guildId: interaction.guild.id });
      await interaction.reply("🧹 Welcome system has been reset.");
    }
  },
};
