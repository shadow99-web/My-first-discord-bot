const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle 
} = require("discord.js");
 // npm i node-fetch

module.exports = {
    data: new SlashCommandBuilder()
        .setName("pin")
        .setDescription("Fetch images or clips from Pinterest by topic")
        .addSubcommand(sub =>
            sub.setName("images")
                .setDescription("Fetch Pinterest images by topic")
                .addStringOption(opt =>
                    opt.setName("query")
                        .setDescription("Search topic")
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName("clips")
                .setDescription("Fetch Pinterest clips by topic")
                .addStringOption(opt =>
                    opt.setName("query")
                        .setDescription("Search topic")
                        .setRequired(true)
                )
        ),

    async execute(context) {
        const { interaction, message, args, isPrefix } = context;

        let sub, query;

        // ✅ Handle both Slash & Prefix commands
        if (isPrefix) {
            sub = args[0]?.toLowerCase();
            query = args.slice(1).join(" ");
            if (!sub || !query)
                return message.reply("❌ Usage: `!pin <images|clips> <topic>`");
        } else {
            if (!interaction.isChatInputCommand()) return;
            sub = interaction.options.getSubcommand();
            query = interaction.options.getString("query");
            // Only defer for slash commands
            await interaction.deferReply().catch(() => {});
        }

        try {
            // ✅ Fetch data from Pinterest JSON API
            const url = `https://api.pinterest.com/v3/search/pins/?q=${encodeURIComponent(query)}&limit=20`;
            const res = await fetch(url);
            const data = await res.json();

            if (!data || !data.data || !data.data.results?.length) {
                const content = `⚠️ No results found for \`${query}\`.`;
                return isPrefix
                    ? message.reply(content)
                    : interaction.editReply({ content }).catch(() => {});
            }

            // Extract image or clip URLs
            const results = data.data.results
                .map(item => sub === "clips" ? item.video?.video_url : item.images?.orig?.url)
                .filter(Boolean)
                .slice(0, 15);

            if (!results.length) {
                const content = `⚠️ No results found for \`${query}\`.`;
                return isPrefix
                    ? message.reply(content)
                    : interaction.editReply({ content }).catch(() => {});
            }

            // ✅ Pagination
            let index = 0;
            const getEmbed = () =>
                new EmbedBuilder()
                    .setColor("#E60023")
                    .setTitle(`📌 Pinterest ${sub === "clips" ? "Clips" : "Images"} - ${query}`)
                    .setImage(results[index])
                    .setFooter({ text: `Result ${index + 1}/${results.length}` });

            const makeButtons = () =>
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId("prev")
                        .setLabel("◀️")
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId("next")
                        .setLabel("▶️")
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setLabel("Download")
                        .setStyle(ButtonStyle.Link)
                        .setURL(results[index])
                );

            const replyOptions = { embeds: [getEmbed()], components: [makeButtons()] };

            // Send initial message
            const msg = isPrefix
                ? await message.reply(replyOptions)
                : await interaction.editReply(replyOptions);

            // Collector for buttons
            const collector = msg.createMessageComponentCollector({ time: 60_000 });

            collector.on("collect", async (btn) => {
                // Only allow the original user
                if (btn.user.id !== (isPrefix ? message.author.id : interaction.user.id))
                    return btn.reply({ content: "⛔ Not for you!", ephemeral: true });

                if (btn.customId === "prev")
                    index = (index - 1 + results.length) % results.length;
                if (btn.customId === "next")
                    index = (index + 1) % results.length;

                await btn.update({ embeds: [getEmbed()], components: [makeButtons()] });
            });

            collector.on("end", async () => {
                await msg.edit({ components: [] }).catch(() => {});
            });

        } catch (err) {
            console.error("Pinterest Fetch Error:", err);
            const errMsg = "❌ Failed to fetch data from Pinterest.";
            if (isPrefix) message.reply(errMsg).catch(() => {});
            else interaction.editReply(errMsg).catch(() => {});
        }
    },
};
