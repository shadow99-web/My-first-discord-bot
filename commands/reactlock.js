const { SlashCommandBuilder } = require("discord.js");
const ReactLock = require("../models/reactLock.js");

module.exports = {
  name: "reactlock",
  data: new SlashCommandBuilder()
    .setName("reactlock")
    .setDescription("Lock reactions on a message so they can't be removed.")
    .addStringOption(option =>
      option.setName("message_id").setDescription("Message ID to lock").setRequired(true)
    ),

  async execute(interaction, prefixArgs) {
    const isSlash = !!interaction.isChatInputCommand;
    const messageId = isSlash
      ? interaction.options.getString("message_id")
      : prefixArgs[0];
    const channel = interaction.channel;

    if (!messageId)
      return interaction.reply({
        content: "❌ Please provide a message ID!",
        ephemeral: isSlash
      });

    try {
      const msg = await channel.messages.fetch(messageId);
      if (!msg) return interaction.reply({ content: "❌ Message not found!", ephemeral: isSlash });

      const existing = await ReactLock.findOne({ messageId: msg.id });
      if (existing)
        return interaction.reply({
          content: "🔒 This message is already locked!",
          ephemeral: isSlash
        });

      await ReactLock.create({
        messageId: msg.id,
        channelId: msg.channel.id,
        guildId: msg.guild.id,
        lockedBy: interaction.user.id
      });

      await interaction.reply({
        content: `🔒 Locked reactions on [this message](${msg.url}).`,
        ephemeral: isSlash
      });
    } catch (err) {
      console.error(err);
      interaction.reply({ content: "❌ Failed to lock reactions.", ephemeral: isSlash });
    }
  }
};
