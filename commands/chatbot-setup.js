const { SlashCommandBuilder, ChannelType, PermissionFlagsBits } = require("discord.js");
const ChatBotConfig = require("../models/chatbot.js");

module.exports = {
  name: "chatbot-setup",
  description: "Set up a chatbot channel for AI responses",
  data: new SlashCommandBuilder()
    .setName("chatbot-setup")
    .setDescription("Set up the chatbot channel")
    .addChannelOption(option =>
      option
        .setName("channel")
        .setDescription("The channel where the bot will chat")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(context) {
    const isSlash = !!context.interaction;
    const guildId = isSlash ? context.interaction.guild.id : context.message.guild.id;
    const member = isSlash ? context.interaction.member : context.message.member;

    // permission check
    if (!member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      const msg = "❌ You need `Manage Server` permission to use this command.";
      return isSlash
        ? context.interaction.reply({ content: msg, ephemeral: true })
        : context.message.reply(msg);
    }

    const channel = isSlash
      ? context.interaction.options.getChannel("channel")
      : context.message.mentions.channels.first();

    if (!channel) {
      const msg = "❌ Please mention a valid text channel!";
      return isSlash
        ? context.interaction.reply({ content: msg, ephemeral: true })
        : context.message.reply(msg);
    }

    await ChatBotConfig.findOneAndUpdate(
      { guildId },
      { channelId: channel.id },
      { upsert: true }
    );

    const replyMsg = `✅ Chatbot successfully enabled in ${channel}. The bot will now reply to all messages there.`;
    if (isSlash)
      await context.interaction.reply({ content: replyMsg });
    else
      await context.message.reply(replyMsg);
  },
};
