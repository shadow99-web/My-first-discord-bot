const { 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  StringSelectMenuBuilder 
} = require("discord.js");

const { generateQuote } = require("../utils/quoteGenerator");

module.exports = {
  name: "quote",
  async execute({ message, args, client }) {

    const text = args.join(" ") || "No text";

    const state = {
      text, // ✅ STORE TEXT
      invertBg: false,
      sharpen: false,
      flipText: false,
      landscape: false,
      blur: false,
      brightness: false,
      pixelate: false,
      font: "default"
    };

    const buffer = await generateQuote(message.author, text, state);

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("q_invert").setEmoji("☀️").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("q_sharpen").setEmoji("🎨").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("q_flip").setEmoji("🔄").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("q_landscape").setEmoji("🖼️").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("q_blur").setEmoji("💧").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("q_bright").setEmoji("🔆").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("q_pixel").setEmoji("🔳").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("q_reset").setEmoji("🗑️").setStyle(ButtonStyle.Danger)
    );

    const fonts = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("q_font") // ✅ FIXED
        .setPlaceholder("Select a font")
        .addOptions([
          { label: "Default", value: "default" },
          { label: "Bold", value: "bold" },
          { label: "Anime", value: "anime" }
        ])
    );

    const sent = await message.reply({
      files: [{ attachment: buffer, name: "quote.png" }],
      components: [buttons, fonts]
    });

    if (!client.quoteStates) client.quoteStates = new Map();

    client.quoteStates.set(sent.id, state);
  }
};
