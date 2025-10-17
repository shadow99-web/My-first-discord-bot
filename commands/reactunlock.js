const { SlashCommandBuilder } = require("discord.js");
const ReactLock = require("../models/reactLock.js");

module.exports = {
  name: "reactunlock",
  data: new SlashCommandBuilder()
    .setName("reactunlock")
    .setDescription("Unlock a locked reaction message.")
    .addStringOption(option =>
      option.setName("message_id").setDescription("Locked message ID").setRequired(true)
    ),

  async execute(interaction, prefixArgs) {
    const isSlash = !!interaction.isChatInputCommand;
    const messageId = isSlash
      ? interaction.options.getString("message_id")
      : prefixArgs[0];

    if (!messageId)
      return interaction.reply({
        content: "❌ Please provide a message ID!",
        ephemeral: isSlash
      });

    const lock = await ReactLock.findOneAndDelete({ messageId });
    if (!lock)
      return interaction.reply({
        content: "❌ No lock found for that message.",
        ephemeral: isSlash
      });

    interaction.reply({
      content: `🔓 Reactions unlocked for message **${messageId}**.`,
      ephemeral: isSlash
    });
  }
};
