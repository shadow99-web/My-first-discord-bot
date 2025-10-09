// events/interactionCreate.js
const Giveaway = require("../models/Giveaway");
const { ButtonInteraction } = require("discord.js");

module.exports = async (interaction) => {
  if (!(interaction instanceof ButtonInteraction)) return;

  const idPrefix = "giveaway_enter:";
  if (interaction.customId.startsWith(idPrefix)) {
    const gwId = interaction.customId.split(":")[1];
    if (!gwId) return interaction.reply({ content: "❌ Invalid giveaway id.", ephemeral: true });

    const doc = await Giveaway.findById(gwId).catch(() => null);
    if (!doc) return interaction.reply({ content: "❌ Giveaway not found.", ephemeral: true });
    if (doc.ended) return interaction.reply({ content: "⚠️ This giveaway has already ended.", ephemeral: true });

    const userId = interaction.user.id;
    const participants = new Set(doc.participants.map((s) => s.toString()));

    if (participants.has(userId)) {
      // leave
      participants.delete(userId);
      doc.participants = Array.from(participants);
      await doc.save();
      return interaction.reply({ content: "🙂 You have left the giveaway.", ephemeral: true });
    } else {
      // join
      participants.add(userId);
      doc.participants = Array.from(participants);
      await doc.save();
      return interaction.reply({ content: "♥ You have entered the giveaway!", ephemeral: true });
    }
  }
};
