const {
  SlashCommandBuilder,
  EmbedBuilder,
} = require("discord.js");
const ReactLock = require("../models/reactLock.js");

module.exports = {
  name: "reactlock",
  description: "Lock reactions on a message (prevent removal)",
  data: new SlashCommandBuilder()
    .setName("reactlock")
    .setDescription("Lock reactions on a message")
    .addStringOption(option =>
      option
        .setName("message_id")
        .setDescription("ID of the message to lock")
        .setRequired(true)
    ),

  async execute({ client, interaction, message, args = [], isPrefix }) {
    const guild = interaction?.guild || message.guild;
    const channel = interaction?.channel || message.channel;
    let messageId;

    // ✅ Safe handling for missing args
    if (isPrefix) {
      if (!args || args.length === 0) {
        return message.reply("⚠️ Usage: `!reactlock <messageId>`");
      }
      messageId = args[0];
    } else {
      messageId = interaction.options.getString("message_id");
      await interaction.deferReply();
    }

    try {
      const targetMsg = await channel.messages.fetch(messageId).catch(() => null);
      if (!targetMsg) {
        const reply = "❌ Could not find that message in this channel.";
        return isPrefix ? message.reply(reply) : interaction.editReply(reply);
      }

      // Fetch all reactions
      const allReacts = [];
      for (const [emoji, reaction] of targetMsg.reactions.cache) {
        const users = await reaction.users.fetch();
        users.forEach(user => {
          if (!user.bot) {
            allReacts.push({
              emoji: emoji,
              userId: user.id,
            });
          }
        });
      }

      await ReactLock.findOneAndUpdate(
        { messageId },
        {
          guildId: guild.id,
          channelId: channel.id,
          lockedReactions: allReacts,
        },
        { upsert: true }
      );

      const embed = new EmbedBuilder()
        .setTitle("🔒 Reaction Lock Enabled")
        .setDescription(
          `All current reactions on [this message](${targetMsg.url}) are now locked.\nNo one can remove them!`
        )
        .setColor("Aqua")
        .setTimestamp();

      if (isPrefix) message.reply({ embeds: [embed] });
      else interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error("ReactLock error:", err);
      const reply = "❌ Failed to lock reactions.";
      if (isPrefix) message.reply(reply);
      else interaction.editReply(reply);
    }
  },
};
