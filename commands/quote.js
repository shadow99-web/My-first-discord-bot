const { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require("discord.js");

module.exports = {
  name: "quote",
  async execute({ message, args, client }) {
    const text = args.join(" ") || "No text";

    const state = {
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
      new ButtonBuilder().setCustomId("invert").setLabel("☀️").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("sharpen").setLabel("🎨").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("flip").setLabel("🔄").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("landscape").setLabel("🖼️").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("blur").setLabel("💧").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("bright").setLabel("🔆").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("pixel").setLabel("🔳").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("reset").setLabel("🗑️").setStyle(ButtonStyle.Danger)
    );

    const fonts = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("font")
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

    client.quoteStates.set(sent.id, state);
  }
};
