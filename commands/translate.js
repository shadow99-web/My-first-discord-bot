// commands/translate.js
const { EmbedBuilder, SlashCommandBuilder } = require("discord.js");

// Cache supported languages
let LANG_CACHE = {};

async function fetchLanguages() {
  try {
    const res = await fetch("https://libretranslate.de/languages"); // ✅ Native fetch
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

  // ✅ For loader: data must exist
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
    // Ensure we have language cache
    if (Object.keys(LANG_CACHE).length === 0) {
      await fetchLanguages();
    }

    let targetLang = "en"; // default
    let text;

    if (isPrefix) {
      if (args.length === 0 && !message.reference) {
        return message.reply("❌ Please provide text or reply to a message.");
      }

      // Check if first arg is a valid language code
      if (args.length > 0 && LANG_CACHE[args[0]]) {
        targetLang = args.shift();
      }

      if (message.reference) {
        try {
          const refMsg = await message.channel.messages.fetch(message.reference.messageId);
          text = refMsg.content;
        } catch {
          return message.reply("❌ Could not fetch the replied message.");
        }
      } else {
        text = args.join(" ");
      }
    } else {
      // Slash command
      targetLang = interaction.options.getString("target") || "en";
      text = interaction.options.getString("text");

      if (!text && interaction.reference) {
        const refMsg = await interaction.channel.messages.fetch(interaction.reference.messageId).catch(() => null);
        text = refMsg?.content;
      }

      if (!text) {
        return interaction.reply({ content: "❌ Please provide text or reply to a message.", ephemeral: true });
      }
    }

    try {
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
      const embed = new EmbedBuilder()
        .setColor("Blue")
        .setTitle("🌍 Translation Result")
        .addFields(
          { name: "Original", value: `\`\`\`${text}\`\`\`` },
          { name: `Translated (${LANG_CACHE[targetLang] || targetLang})`, value: `\`\`\`${data.translatedText}\`\`\`` }
        )
        .setFooter({ text: `${blueHeart} Translation powered by LibreTranslate` });

      if (isPrefix) {
        await message.reply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed] });
      }
    } catch (err) {
      console.error("❌ Translate error:", err);
      if (isPrefix) {
        await message.reply("⚠️ Failed to translate text.");
      } else {
        await interaction.reply({ content: "⚠️ Failed to translate text.", ephemeral: true });
      }
    }
  },
};
