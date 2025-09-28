// ============================
// ⚡ Smart Translation Command
// Prefix + Slash + Auto Source + Auto Target
// Embedded with Blue Heart Emoji
// ============================

const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const OpenAI = require("openai");
const { Translate } = require("@vitalets/google-translate-api"); // Optional Google fallback

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Your blue heart emoji
const BLUE_HEART = "<a:blue_heart:1414309560231002194>";

module.exports = {
    data: new SlashCommandBuilder()
        .setName("translate")
        .setDescription("Smart translation with auto-detect languages")
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
            // Example: !translate hi Hello world OR !translate Hello world
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
                const detectResponse = await fetch("https://libretranslate.de/detect", {
                    method: "POST",
                    body: JSON.stringify({ q: text }),
                    headers: { "Content-Type": "application/json" }
                });
                const detectData = await detectResponse.json();
                // If source is English, target Hindi; else target English
                const sourceLang = detectData[0]?.language || "en";
                targetLang = sourceLang === "en" ? "hi" : "en";
            } catch (detectError) {
                console.warn("Language detection failed, defaulting to English");
                targetLang = "en";
            }
        }

        // ====================
        // 1️⃣ Try LibreTranslate
        // ====================
        try {
            const response = await fetch("https://libretranslate.de/translate", {
                method: "POST",
                body: JSON.stringify({
                    q: text,
                    source: "auto",
                    target: targetLang,
                    format: "text"
                }),
                headers: { "Content-Type": "application/json" }
            });

            const data = await response.json();
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
        // 2️⃣ Try Google Translate
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
        // 3️⃣ Fallback: OpenAI GPT
        // ====================
        try {
            const gptResponse = await openai.chat.completions.create({
                model: "gpt-5-mini",
                messages: [
                    { role: "system", content: "You are a professional translator." },
                    { role: "user", content: `Translate the following text to ${targetLang} while preserving emojis, formatting, and context:\n\n${text}` }
                ]
            });

            const translatedText = gptResponse.choices[0].message.content;

            const embed = new EmbedBuilder()
                .setTitle(`${BLUE_HEART} Translation (OpenAI Fallback) ${BLUE_HEART}`)
                .addFields(
                    { name: "Original", value: text },
                    { name: "Translated", value: translatedText }
                )
                .setColor("Green");

            return interaction.reply({ embeds: [embed] });

        } catch (gptError) {
            console.error("OpenAI translation failed:", gptError.message);
            return interaction.reply(`⚠️ Translation failed completely: ${gptError.message}`);
        }
    }
};
