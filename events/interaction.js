const Giveaway = require("../models/Giveaway");
const { EmbedBuilder } = require("discord.js");
const { sendTicketPanel, handleTicketMenu, handleTicketClose } = require("../Handlers/ticketHandler");

module.exports = (client, blockHelpers) => {
  client.on("interactionCreate", async (interaction) => {

    const safeReply = async (options) => {
      try {
        if (interaction.replied) return await interaction.followUp(options).catch(() => {});
        if (interaction.deferred) return await interaction.editReply(options).catch(() => {});
        return await interaction.reply(options).catch(() => {});
      } catch (e) {
        console.error("❌ safeReply error:", e);
      }
    };

    try {

      // ---------- Slash Commands ----------
      if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return safeReply({ content: "❌ Command not found.", ephemeral: true });

        const guildId = interaction.guildId;
        const userId = interaction.user.id;

        // Block check
        if (blockHelpers?.isBlocked?.(userId, guildId, interaction.commandName)) {
          return safeReply({
            embeds: [
              new EmbedBuilder()
                .setColor("Red")
                .setTitle("🚫 Command Blocked")
                .setDescription(`You are blocked from using \`${interaction.commandName}\``),
            ],
            ephemeral: true,
          });
        }

        try {
          // Command should use safeReply only
          await command.execute({
            client,
            interaction,
            safeReply,
            args: [],
            isPrefix: false,
          });
        } catch (err) {
          console.error(`❌ Error in command ${interaction.commandName}:`, err);
          await safeReply({ content: "⚠️ Something went wrong while executing the command!", ephemeral: true });
        }
        return;
      }

      // ---------- Context Menus ----------
      if (interaction.isUserContextMenuCommand() || interaction.isMessageContextMenuCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;
        try {
          await command.execute({ client, interaction, safeReply, args: [], isPrefix: false });
        } catch (err) {
          console.error(`❌ Context menu error ${interaction.commandName}:`, err);
          await safeReply({ content: "⚠️ Something went wrong!", ephemeral: true });
        }
        return;
      }

      // ---------- Buttons ----------
      if (interaction.isButton()) {
        try {
          // Ticket button
          if (interaction.customId === "ticket_close_button") {
            await handleTicketClose(interaction, safeReply);
            return;
          }

          // Giveaway buttons
          if (interaction.customId.startsWith("giveaway_enter:")) {
            const gwId = interaction.customId.split(":")[1];
            if (!gwId) return safeReply({ content: "❌ Invalid giveaway id.", ephemeral: true });

            const doc = await Giveaway.findById(gwId).catch(() => null);
            if (!doc) return safeReply({ content: "❌ Giveaway not found.", ephemeral: true });
            if (doc.ended) return safeReply({ content: "⚠️ This giveaway has ended.", ephemeral: true });

            const userId = interaction.user.id;
            const participants = new Set(doc.participants.map((s) => s.toString()));

            if (participants.has(userId)) {
              participants.delete(userId);
              doc.participants = Array.from(participants);
              await doc.save();
              return safeReply({ content: "🙂 You have left the giveaway.", ephemeral: true });
            } else {
              participants.add(userId);
              doc.participants = Array.from(participants);
              await doc.save();
              return safeReply({ content: "♥ You have entered the giveaway!", ephemeral: true });
            }
          }
        } catch (err) {
          console.error("❌ Button interaction error:", err);
          await safeReply({ content: "⚠️ Something went wrong!", ephemeral: true });
        }
        return;
      }

      // ---------- Select Menus ----------
      if (interaction.isStringSelectMenu()) {
        try {
          if (interaction.customId === "ticket_menu") {
            await handleTicketMenu(interaction, safeReply);
          }
        } catch (err) {
          console.error("❌ Select menu interaction error:", err);
          await safeReply({ content: "⚠️ Something went wrong!", ephemeral: true });
        }
        return;
      }

      console.warn("⚠️ Unknown interaction type:", interaction.type);

    } catch (err) {
      console.error("❌ Interaction handler error:", err);
      await safeReply({ content: "⚠️ Something went wrong!", ephemeral: true });
    }
  });
};
