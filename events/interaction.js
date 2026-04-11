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
  if (!command) return;

  // 🔐 BLOCK CHECK (RIGHT PLACE)
  if (blockHelpers?.isBlocked) {
    const blocked = await blockHelpers.isBlocked({
      guildId: interaction.guild.id,
      userId: interaction.user.id,
      command: interaction.commandName,
      member: interaction.member,
    });

    if (blocked) {
      return safeReply({
        embeds: [
          new EmbedBuilder()
            .setColor("Red")
            .setTitle(" Command Blocked")
            .setDescription(
              `You are blocked from using **${interaction.commandName}**.`
            ),
        ],
        ephemeral: true,
      });
    }
  }

  // ✅ EXECUTE COMMAND
  try {
    await command.execute({
      client,
      interaction,
      safeReply,
      args: [],
      isPrefix: false,
    });
  } catch (err) {
    console.error(`❌ Error in command ${interaction.commandName}:`, err);
    safeReply({ content: "⚠️ Something went wrong!", ephemeral: true });
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
// ---------- Buttons ----------
if (interaction.isButton()) {
  try {
    const id = interaction.customId;

    // =========================
    // 🖼️ QUOTE BUTTON SYSTEM
    // =========================
    if (id.startsWith("q_")) {
      const { generateQuote } = require("../utils/quoteGenerator");

      const state = client.quoteStates?.get(interaction.message.id);
      if (!state) return;

      if (id === "q_invert") state.invertBg = !state.invertBg;
      if (id === "q_sharpen") state.sharpen = !state.sharpen;
      if (id === "q_flip") state.flipText = !state.flipText;
      if (id === "q_landscape") state.landscape = !state.landscape;
      if (id === "q_blur") state.blur = !state.blur;
      if (id === "q_bright") state.brightness = !state.brightness;
      if (id === "q_pixel") state.pixelate = !state.pixelate;

      if (id === "q_reset") {
        state.invertBg = false;
        state.sharpen = false;
        state.flipText = false;
        state.landscape = false;
        state.blur = false;
        state.brightness = false;
        state.pixelate = false;
      }

      const buffer = await generateQuote(interaction.user, state);

      await interaction.update({
        files: [{ attachment: buffer, name: "quote.png" }]
      });

      return; // VERY IMPORTANT
    }

    // 🎟️ Ticket system
    if (id === "ticket_close_button") {
      await handleTicketClose(interaction, safeReply);
      return;
    }

    // ♟️ Chess buttons
    const chess = client.commands.get("chess");
    if (
      chess &&
      (["select", "resign", "cancel"].some((x) => id.startsWith(x)) ||
        id.startsWith("move_"))
    ) {
      await chess.handleButton?.(interaction, client);
      return;
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

    // =========================
    // 🎨 FONT SELECT (QUOTE)
    // =========================
    if (interaction.customId === "q_font") {
      const { generateQuote } = require("../utils/quoteGenerator");

      const state = client.quoteStates?.get(interaction.message.id);
      if (!state) return;

      state.font = interaction.values[0];

      const buffer = await generateQuote(interaction.user, state);

      await interaction.update({
        files: [{ attachment: buffer, name: "quote.png" }]
      });

      return;
    }

    // 🎟️ Ticket menu
    if (interaction.customId === "ticket_menu") {
      await handleTicketMenu(interaction, safeReply);
      return;
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
