// ============================
// ⚡ Smart Translation Command (No OpenAI, No node-fetch)
// Prefix + Slash + Auto Source + Auto Target
// Embedded with Blue Heart Emoji
// ============================

const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const Translate = require("@vitalets/google-translate-api"); // Google Translate
require("dotenv").config();

// Blue heart animated emoji
const BLUE_HEART = "<a:blue_heart:1414309560231002194>";

module.exports = {
    data: new SlashCommandBuilder()
        .setName("translate")
        .setDescription("Smart translation with auto-detect languages (No OpenAI)")
        .addStringOption(option =>
            option.setName("text")
                .setDescription("Text to translate")
                .setRequired(true))
        .addStringOption(option =>
            option.setName("lang")
                .setDescription("Target language (optional, auto-detect if empty)")
                .setRequired(false)),

    async execute(interaction, client, prefixCommand = false) {
        let text, targetLang;

        if (prefixCommand) {
            const args = interaction.content.split(" ").slice(1);
            if (args.length === 0) return interaction.reply(`Usage: !translate <lang?> <text>`);

            if (args[0].length === 2) {
                targetLang = args.shift();
            } else {
                targetLang = null; // auto detect
            }
            text = args.join(" ");
        } else {
            text = interaction.options.getString("text");
            targetLang = interaction.options.getString("lang");
        }

        // ====================
        // Auto-detect target language using LibreTranslate detection API
        // ====================
        if (!targetLang) {
            try {
                const detectResp = await fetch("https://libretranslate.de/detect", {
                    method: "POST",
                    body: JSON.stringify({ q: text }),
                    headers: { "Content-Type": "application/json" }
                });
                const detectData = await detectResp.json();
                const sourceLang = detectData[0]?.language || "en";
                targetLang = sourceLang === "en" ? "hi" : "en"; // default fallback
            } catch (err) {
                console.warn("Language detection failed, defaulting to English");
                targetLang = "en";
            }
        }

        // ====================
        // 1️⃣ LibreTranslate
        // ====================
        try {
            const resp = await fetch("https://libretranslate.de/translate", {
                method: "POST",
                body: JSON.stringify({
                    q: text,
                    source: "auto",
                    target: targetLang,
                    format: "text"
                }),
                headers: { "Content-Type": "application/json" }
            });
            const data = await resp.json();
            if (data.translatedText) {
                const embed = new EmbedBuilder()
                    .setTitle(`${BLUE_HEART} Translation (LibreTranslate) ${BLUE_HEART}`)
                    .addFields(
                        { name: "Original", value: text },
                        { name: "Translated", value: data.translatedText }
                    )
                    .setColor("Blue");
                return interaction.reply({ embeds: [embed] });
            }
        } catch (libreError) {
            console.warn("LibreTranslate failed:", libreError.message);
        }

        // ====================
        // 2️⃣ Google Translate
        // ====================
        try {
            const googleData = await Translate(text, { to: targetLang });
            if (googleData && googleData.text) {
                const embed = new EmbedBuilder()
                    .setTitle(`${BLUE_HEART} Translation (Google Translate) ${BLUE_HEART}`)
                    .addFields(
                        { name: "Original", value: text },
                        { name: "Translated", value: googleData.text }
                    )
                    .setColor("Orange");
                return interaction.reply({ embeds: [embed] });
            }
        } catch (googleError) {
            console.warn("Google Translate failed:", googleError.message);
        }

        // ====================
        // 3️⃣ DeepL Fallback (optional, free-tier API)
        // ====================
        if (process.env.DEEPL_API_KEY) {
            try {
                const deeplResp = await fetch(`https://api-free.deepl.com/v2/translate?auth_key=${process.env.DEEPL_API_KEY}&text=${encodeURIComponent(text)}&target_lang=${targetLang.toUpperCase()}`);
                const deeplData = await deeplResp.json();
                if (deeplData.translations && deeplData.translations[0].text) {
                    const embed = new EmbedBuilder()
                        .setTitle(`${BLUE_HEART} Translation (DeepL) ${BLUE_HEART}`)
                        .addFields(
                            { name: "Original", value: text },
                            { name: "Translated", value: deeplData.translations[0].text }
                        )
                        .setColor("Purple");
                    return interaction.reply({ embeds: [embed] });
                }
            } catch (deeplError) {
                console.warn("DeepL translation failed:", deeplError.message);
            }
        }

        // ====================
        // All engines failed
        // ====================
        return interaction.reply(`⚠️ Translation failed: All engines could not process the text.`);
    }
};
