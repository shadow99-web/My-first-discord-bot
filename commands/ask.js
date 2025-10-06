const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ask")
        .setDescription("Ask AI anything using public APIs")
        .addStringOption(option =>
            option.setName("question")
                .setDescription("Your question for the AI")
                .setRequired(true)
        ),

    async execute(context) {
        const isSlash = !context.isPrefix;
        const question = isSlash
            ? context.interaction.options.getString("question")
            : context.args.join(" ");

        if (!question) {
            const msg = "❌ Please ask a question!";
            if (isSlash) return context.interaction.reply({ content: msg, ephemeral: true });
            return context.message.reply(msg);
        }

        if (isSlash) await context.interaction.deferReply();

        const apis = [
            { name: "PearkTrue", url: "https://api.pearktrue.xyz/api/chatgpt", method: "POST", body: { prompt: question } },
            { name: "DuckDuckGo", url: `https://api.duckduckgo.com/?q=${encodeURIComponent(question)}&format=json`, method: "GET" },
            { name: "MikuAI", url: `https://api.mikuapi.xyz/v1/ai?ask=${encodeURIComponent(question)}`, method: "GET" },
            { name: "SimSimi", url: `https://api.simsimi.net/v2/?text=${encodeURIComponent(question)}&lc=en`, method: "GET" },
            { name: "SomeRandomAPI", url: `https://some-random-api.com/chatbot?message=${encodeURIComponent(question)}`, method: "GET" },
        ];

        let answer = null;
        for (const api of apis) {
            try {
                const res = await fetch(api.url, {
                    method: api.method,
                    headers: { "Content-Type": "application/json" },
                    body: api.body ? JSON.stringify(api.body) : undefined,
                });
                const data = await res.json();
                answer = data.answer || data.response || data.result || data.message || data.content || data.assistant || data.abstract || data.AbstractText || (Array.isArray(data.results) && data.results[0]?.text) || null;
                if (answer) break;
            } catch {}
        }

        if (!answer) answer = "⚠️ All AI APIs failed to respond. Try again later.";

        const chunks = answer.match(/[\s\S]{1,1900}/g) || ["(empty response)"];
        let page = 0;

        const makeEmbed = () => new EmbedBuilder()
            .setTitle("🤖 AI Response")
            .setDescription(chunks[page])
            .setColor(0x5865F2) // Discord blurple color, safe and standard
            .setFooter({ text: `Page ${page + 1} / ${chunks.length}` });

        const makeRow = () => new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("prev").setLabel("⬅️").setStyle(ButtonStyle.Primary).setDisabled(page === 0),
            new ButtonBuilder().setCustomId("next").setLabel("➡️").setStyle(ButtonStyle.Primary).setDisabled(page === chunks.length - 1)
        );

        const sent = isSlash
            ? await context.interaction.editReply({ embeds: [makeEmbed()], components: [makeRow()] })
            : await context.message.reply({ embeds: [makeEmbed()], components: [makeRow()] });

        const collector = sent.createMessageComponentCollector({ time: 60000 });
        collector.on("collect", async (i) => {
            const authorId = isSlash ? context.interaction.user.id : context.message.author.id;
            if (i.user.id !== authorId) return i.reply({ content: "❌ Only you can control this.", ephemeral: true });
            if (i.customId === "next" && page < chunks.length - 1) page++;
            if (i.customId === "prev" && page > 0) page--;
            await i.update({ embeds: [makeEmbed()], components: [makeRow()] });
        });
        collector.on("end", () => sent.edit({ components: [] }).catch(() => {}));
    }
};
