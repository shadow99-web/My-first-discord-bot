const { 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  StringSelectMenuBuilder 
} = require("discord.js");

const { generateQuote } = require("../utils/quoteGenerator");

module.exports = {
  name: "quote",
  description: "Create a quote",

  options: [
    {
      name: "text",
      type: 3, // STRING
      description: "Text for the quote",
      required: false
    }
  ],

  async execute({ message, interaction, args, client, repliedMessage }) {

    // 🎯 GET TEXT (priority system)
    let text;

    // 1. Reply message (prefix)
    if (repliedMessage) {
      text = repliedMessage.content;
    }

    // 2. Slash command input
    else if (interaction && !interaction.isFake) {
      text = interaction.options.getString("text");
    }

    // 3. Prefix args
    else {
      text = args.join(" ");
    }

    if (!text) text = "No text";

    const user =
      repliedMessage?.author ||
      message?.author ||
      interaction?.user;

    const state = {
      text,
      invertBg: false,
      sharpen: false,
      flipText: false,
      landscape: false,
      blur: false,
      brightness: false,
      pixelate: false,
      font: "default"
    };

    const buffer = await generateQuote(user, text, state);

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
        .setCustomId("q_font")
        .setPlaceholder("Select a font")
        .addOptions([
          { label: "Default", value: "default" },
          { label: "Bold", value: "bold" },
          { label: "Anime", value: "anime" }
        ])
    );

    const replyFn = interaction && !interaction.isFake
      ? (data) => interaction.reply(data)
      : (data) => message.reply(data);

    const sent = await replyFn({
      files: [{ attachment: buffer, name: "quote.png" }],
      components: [buttons, fonts]
    });

    if (!client.quoteStates) client.quoteStates = new Map();
    client.quoteStates.set(sent.id, state);
  }
};
