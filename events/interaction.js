// events/interaction.js
const { EmbedBuilder } = require("discord.js");
const { sendTicketPanel, handleTicketMenu, handleTicketClose } = require("../Handlers/ticketHandler");

module.exports = (client, blockHelpers) => {
  client.on("interactionCreate", async (interaction) => {
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
        if (!command) {
          return safeReply({ content: "❌ Command not found.", ephemeral: true });
        }

        const guildId = interaction.guildId;
        const userId = interaction.user.id;

        // Block check
        if (blockHelpers?.isBlocked?.(guildId, userId, interaction.commandName)) {
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
          if (typeof command.execute === "function") {
            // 🔑 Pass everything so commands work the same as prefix
            await command.execute({
              client,
              interaction,
              message: null,
              args: [],
              isPrefix: false,
            });
          } else {
            await safeReply({ content: "❌ This command cannot be used as a slash command.", ephemeral: true });
          }
        } catch (err) {
          console.error(`❌ Error in command ${interaction.commandName}:`, err);
          await safeReply({ content: "⚠️ Something went wrong while executing the command!", ephemeral: true });
        }
        return;
      }

      // ---------- Context Menu ----------
      if (interaction.isUserContextMenuCommand() || interaction.isMessageContextMenuCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;
        try {
          if (typeof command.execute === "function") {
            await command.execute({
              client,
              interaction,
              message: null,
              args: [],
              isPrefix: false,
            });
          }
        } catch (err) {
          console.error(`❌ Error in context menu command ${interaction.commandName}:`, err);
          await safeReply({ content: "⚠️ Something went wrong!", ephemeral: true });
        }
        return;
      }

      // ---------- Buttons ----------
      if (interaction.isButton()) {
        try {
          if (interaction.customId === "ticket_close_button") {
            await handleTicketClose(interaction);
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
            await handleTicketMenu(interaction);
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
