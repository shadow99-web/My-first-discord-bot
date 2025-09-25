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
          // ✅ If your command may take >3s, defer reply first
          if (!interaction.deferred && !interaction.replied) await interaction.deferReply({ ephemeral: true });

          await command.execute({
            client,
            interaction,
            message: null,
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
          if (!interaction.deferred && !interaction.replied) await interaction.deferReply({ ephemeral: true });
          await command.execute({ client, interaction, message: null, args: [], isPrefix: false });
        } catch (err) {
          console.error(`❌ Context menu error ${interaction.commandName}:`, err);
          await safeReply({ content: "⚠️ Something went wrong!", ephemeral: true });
        }
        return;
      }

      // ---------- Buttons ----------
      if (interaction.isButton()) {
        try {
          if (interaction.customId === "ticket_close_button") await handleTicketClose(interaction);
        } catch (err) {
          console.error("❌ Button interaction error:", err);
          await safeReply({ content: "⚠️ Something went wrong!", ephemeral: true });
        }
        return;
      }

      // ---------- Select Menus ----------
      if (interaction.isStringSelectMenu()) {
        try {
          if (interaction.customId === "ticket_menu") await handleTicketMenu(interaction);
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
