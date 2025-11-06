const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("display")
        .setDescription("Search for images from Pinterest")
        .addStringOption(option =>
            option.setName("query")
                .setDescription("The search term (e.g., cats, cars, anime)")
                .setRequired(true)
        ),

    async execute(context) {
        const query = context.isPrefix
            ? context.args.join(" ")
            : context.interaction.options.getString("query");

        if (!query) {
            const msg = "❌ Please provide a search query!";
            return context.isPrefix
                ? context.message.reply(msg)
                : context.interaction.reply({ content: msg, ephemeral: true });
        }

        try {
            if (!context.isPrefix) await context.interaction.deferReply();

            // ✅ Using a free public Pinterest image API (Unofficial)
            const response = await fetch(`https://pinterest-api.vercel.app/?query=${encodeURIComponent(query)}`);
            const results = await response.json();

            if (!results || results.length === 0) {
                const msg = `⚠️ No results found for **${query}**`;
                return context.isPrefix
                    ? context.message.reply(msg)
                    : context.interaction.followUp({ content: msg, ephemeral: true });
            }

            let index = 0;
            const generateEmbed = () => new EmbedBuilder()
                .setColor("Random")
                .setTitle(`🖼️ Pinterest Results for "${query}"`)
                .setImage(results[index])
                .setFooter({ text: `Image ${index + 1} of ${results.length}` });

            const prev = new ButtonBuilder().setCustomId("prev").setLabel("⬅ Prev").setStyle(ButtonStyle.Secondary);
            const next = new ButtonBuilder().setCustomId("next").setLabel("Next ➡").setStyle(ButtonStyle.Secondary);

            const row = new ActionRowBuilder().addComponents(prev, next);

            const replyMsg = context.isPrefix
                ? await context.message.reply({ embeds: [generateEmbed()], components: [row] })
                : await context.interaction.followUp({ embeds: [generateEmbed()], components: [row] });

            const collector = replyMsg.createMessageComponentCollector({ time: 60000 });

            collector.on("collect", async (i) => {
                if (i.user.id !== (context.user?.id || context.interaction.user.id))
                    return i.reply({ content: "⛔ Not your buttons!", ephemeral: true });

                if (i.customId === "prev" && index > 0) index--;
                else if (i.customId === "next" && index < results.length - 1) index++;

                await i.update({ embeds: [generateEmbed()] });
            });

        } catch (err) {
            console.error("❌ Pinterest Fetch Error:", err);
            const msg = "⚠️ Error fetching images. Please try again later.";
            return context.isPrefix
                ? context.message.reply(msg)
                : context.interaction.reply({ content: msg, ephemeral: true });
        }
    }
};
