// commands/ask.js
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ask")
        .setDescription("Ask something to the AI")
        .addStringOption(option =>
            option.setName("question")
                .setDescription("Your question to AI")
                .setRequired(true)),

    async execute({ client, message, interaction, args, isPrefix, safeReply }) {
        const BLUE_HEART = "<a:blue_heart:1414309560231002194>";

        // Unified reply helper
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
            // Get user input
            let question;
            if (isPrefix) {
                if (message.reference) {
                    const repliedMessage = await message.channel.messages.fetch(message.reference.messageId);
                    question = repliedMessage.content;
                } else {
                    question = args.join(" ");
                }
                if (!question) return reply("⚠️ Please provide a question!");
            } else {
                question = interaction.options.getString("question");
                if (!question) return reply("⚠️ Please provide a question!");
            }

            // Call Libre AI endpoint
            const res = await fetch("https://libreapi.de/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: question })
            });

            // Validate JSON response
            const contentType = res.headers.get("content-type") || "";
            if (!contentType.includes("application/json")) {
                return reply("⚠️ AI API returned invalid response (HTML). Try again later.");
            }

            const data = await res.json();
            const aiReply = data.response || "⚠️ AI did not respond.";

            // Embed reply
            const embed = new EmbedBuilder()
                .setTitle(`${BLUE_HEART} Ask AI ${BLUE_HEART}`)
                .addFields(
                    { name: "You asked", value: question },
                    { name: "AI answered", value: aiReply }
                )
                .setColor("Purple")
                .setTimestamp();

            return reply({ embeds: [embed] });

        } catch (err) {
            console.error("❌ Ask AI command error:", err);
            return reply("❌ Something went wrong while contacting the AI!");
        }
    }
};
