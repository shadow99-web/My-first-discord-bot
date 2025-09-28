// ============================
// ⚡ Smart Translate Command
// Handles Prefix & Slash + Reply Detection + Fallback Engines
// ============================

const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const Translate = require("@vitalets/google-translate-api");
require("dotenv").config();

const BLUE_HEART = "<a:blue_heart:1414309560231002194>";

module.exports = {
    data: new SlashCommandBuilder()
        .setName("translate")
        .setDescription("Translate a message (supports replies and auto language detection)")
        .addStringOption(option =>
            option.setName("text")
                .setDescription("Text to translate (optional if replying)")
                .setRequired(false))
        .addStringOption(option =>
            option.setName("lang")
                .setDescription("Target language (optional)")
                .setRequired(false)),

    async execute({ client, message, interaction, args, isPrefix, safeReply }) {
        let text, targetLang;

        // ---------- Unified reply helper ----------
        const reply = async (content) => {
            try {
                if (isPrefix) return await message.reply(content).catch(() => {});
                if (safeReply) return await safeReply(content);
                return await interaction.reply(content).catch(() => {});
            } catch (e) {
                console.error("❌ Reply failed:", e);
            }
        };

        try {
            // ---------- Get text ----------
            if (isPrefix) {
                // Prefix command
                if (message.reference) {
                    const repliedMessage = await message.channel.messages.fetch(message.reference.messageId);
                    text = repliedMessage.content;
                } else {
                    text = args.join(" ");
                }

                // Optional target language (first arg as 2-letter code)
                if (args[0] && args[0].length === 2) {
                    targetLang = args.shift();
                    text = text || args.join(" ");
                }

                if (!text) return reply("⚠️ No text found to translate!");

            } else {
                // Slash command
                text = interaction.options.getString("text");
                targetLang = interaction.options.getString("lang");

                if (!text && interaction.message?.reference) {
                    const repliedMessage = await interaction.channel.messages.fetch(interaction.message.reference.messageId);
                    text = repliedMessage.content;
                }

                if (!text) return reply("⚠️ No text found to translate!");
            }

            // ---------- Auto-detect target language ----------
            if (!targetLang) {
                try {
                    const detectResp = await fetch("https://libretranslate.de/detect", {
                        method: "POST",
                        body: JSON.stringify({ q: text }),
                        headers: { "Content-Type": "application/json" }
                    });
                    const detectData = await detectResp.json();
                    const sourceLang = detectData[0]?.language || "en";
                    targetLang = sourceLang === "en" ? "hi" : "en"; // default
                } catch {
                    targetLang = "en";
                }
            }

            // ---------- 1️⃣ LibreTranslate ----------
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
                    return reply({ embeds: [embed] });
                }
            } catch (libreError) {
                console.warn("LibreTranslate failed:", libreError.message);
            }

            // ---------- 2️⃣ Google Translate ----------
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
                    return reply({ embeds: [embed] });
                }
            } catch (googleError) {
                console.warn("Google Translate failed:", googleError.message);
            }

            // ---------- 3️⃣ DeepL Fallback (optional) ----------
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
                        return reply({ embeds: [embed] });
                    }
                } catch (deeplError) {
                    console.warn("DeepL translation failed:", deeplError.message);
                }
            }

            // ---------- All engines failed ----------
            return reply("⚠️ Translation failed: All engines could not process the text.");

        } catch (err) {
            console.error("❌ Translate command error:", err);
            return reply("❌ An unexpected error occurred while translating!");
        }
    }
};
