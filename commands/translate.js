// commands/translate.js
const { EmbedBuilder, SlashCommandBuilder } = require("discord.js");

// Cache supported languages
let LANG_CACHE = {};

async function fetchLanguages() {
  try {
    const res = await fetch("https://libretranslate.de/languages");
    const langs = await res.json();
    LANG_CACHE = {};
    langs.forEach(lang => {
      LANG_CACHE[lang.code] = lang.name;
    });
    return LANG_CACHE;
  } catch (err) {
    console.error("❌ Failed to fetch languages:", err);
    return LANG_CACHE; // fallback
  }
}

module.exports = {
  name: "translate",
  description: "Translate text into another language (default → English).",
  usage: "!translate <target_lang(optional)> <text or reply to message>",

  // ✅ Slash command setup
  data: new SlashCommandBuilder()
    .setName("translate")
    .setDescription("Translate text into another language")
    .addStringOption(option =>
      option
        .setName("target")
        .setDescription("Target language (default: English, e.g., es, fr, hi)")
        .setRequired(false)
    )
    .addStringOption(option =>
      option
        .setName("text")
        .setDescription("Text to translate")
        .setRequired(false)
    ),

  async execute({ client, message, interaction, args, isPrefix }) {
    // Load languages if cache is empty
    if (Object.keys(LANG_CACHE).length === 0) {
      await fetchLanguages();
    }

    let targetLang = "en"; // default
    let text;

    if (isPrefix) {
      // --- Prefix command ---
      if (args.length === 0 && !message.reference) {
        return message.reply("❌ Please provide text or reply to a message.");
      }

      // First arg might be a valid language code
      if (args.length > 0 && LANG_CACHE[args[0]]) {
        targetLang = args.shift();
      }

      if (message.reference) {
        try {
          const refMsg = await message.channel.messages.fetch(message.reference.messageId);
          if (!refMsg?.content) {
            return message.reply("⚠️ The replied message has no text to translate.");
          }
          text = refMsg.content;
        } catch {
          return message.reply("❌ Could not fetch the replied message.");
        }
      } else {
        text = args.join(" ");
      }
    } else {
      // --- Slash command ---
      targetLang = interaction.options.getString("target") || "en";
      text = interaction.options.getString("text");

      if (!text) {
        return interaction.reply({ content: "❌ Please provide text to translate.", ephemeral: true });
      }
    }

    try {
      // Call API
      const res = await fetch("https://libretranslate.de/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          q: text,
          source: "auto",
          target: targetLang,
          format: "text",
        }),
      });

      const data = await res.json();
      if (!data?.translatedText) throw new Error("Translation failed.");

      const blueHeart = "<a:blue_heart:1414309560231002194>";

      // ✅ Handle long texts gracefully
      const original = text.length > 1000 ? text.slice(0, 1000) + "..." : text;
      const translated = data.translatedText.length > 1000
        ? data.translatedText.slice(0, 1000) + "..."
        : data.translatedText;

      // ✅ Add detected language
      const detectedLang =
        data.detectedLanguage?.language &&
        (LANG_CACHE[data.detectedLanguage.language] || data.detectedLanguage.language);

      const embed = new EmbedBuilder()
        .setColor("Blue")
        .setTitle("🌍 Translation Result")
        .addFields(
          { name: "Original", value: `\`\`\`${original}\`\`\`` },
          { name: `Translated (${LANG_CACHE[targetLang] || targetLang})`, value: `\`\`\`${translated}\`\`\`` }
        )
        .setFooter({
          text: `${blueHeart} Translation powered by LibreTranslate${
            detectedLang ? ` | Detected: ${detectedLang}` : ""
          }`,
        });

      if (isPrefix) {
        await message.reply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed] });
      }
    } catch (err) {
      console.error("❌ Translate error:", err);
      const errorMsg = "⚠️ Failed to translate text. Please try again later.";
      if (isPrefix) {
        await message.reply(errorMsg);
      } else {
        await interaction.reply({ content: errorMsg, ephemeral: true });
      }
    }
  },
};
