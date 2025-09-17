// events/interaction.js
const { EmbedBuilder } = require("discord.js");
const { sendTicketPanel, handleTicketMenu, handleTicketClose } = require("../Handlers/ticketHandler");

module.exports = (client, blockHelpers) => {
  client.on("interactionCreate", async (interaction) => {
    // Helper to safely reply or followUp
    const safeReply = async (options) => {
      try {
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(options).catch(() => {});
        } else {
          await interaction.reply(options).catch(() => {});
        }
      } catch (e) {
        console.error("❌ safeReply error:", e);
      }
    };

    try {
      // ---------- Slash Commands ----------
      if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;

        const guildId = interaction.guildId;
        const userId = interaction.user.id;

        // Block check
        if (blockHelpers.isBlocked?.(guildId, userId, interaction.commandName)) {
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

        // Run command safely
        try {
          if (command.execute) {
            await command.execute(interaction); // <--- pass interaction directly
          } else {
            await safeReply({ content: "❌ Command cannot be used as a slash command.", ephemeral: true });
          }
        } catch (err) {
          console.error(`❌ Error in command ${interaction.commandName}:`, err);
          await safeReply({ content: "⚠️ Something went wrong!", ephemeral: true });
        }
      }

      // ---------- Ticket Menu ----------
      if (interaction.isStringSelectMenu() && interaction.customId === "ticket_menu") {
        try {
          await handleTicketMenu(interaction);
        } catch (err) {
          console.error("❌ Ticket menu error:", err);
          await safeReply({ content: "⚠️ Something went wrong!", ephemeral: true });
        }
      }

      // ---------- Ticket Close Button ----------
      if (interaction.isButton() && interaction.customId === "ticket_close_button") {
        try {
          await handleTicketClose(interaction);
        } catch (err) {
          console.error("❌ Ticket close error:", err);
          await safeReply({ content: "⚠️ Something went wrong!", ephemeral: true });
        }
      }
    } catch (err) {
      console.error("❌ Interaction handler error:", err);
      await safeReply({ content: "⚠️ Something went wrong!", ephemeral: true });
    }
  });
};
