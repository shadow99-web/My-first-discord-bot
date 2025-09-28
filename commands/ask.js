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

            // Call AffiliatePlus chatbot API
            const url = `https://api.affiliateplus.xyz/api/chatbot?message=${encodeURIComponent(question)}&botname=Bot&ownername=Owner`;

            let aiReply = "⚠️ AI did not respond.";
            try {
                const res = await fetch(url);
                const contentType = res.headers.get("content-type") || "";
                if (!contentType.includes("application/json")) {
                    return reply("⚠️ AI API returned invalid response. Try again later.");
                }
                const data = await res.json();
                aiReply = data.message || aiReply;
            } catch (err) {
                console.error("❌ AI fetch failed:", err);
                return reply("⚠️ Cannot reach AI API from this host.");
            }

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
            return reply("❌ Something went wrong while processing your request!");
        }
    }
};
