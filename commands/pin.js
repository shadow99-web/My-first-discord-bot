const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { search } = require("pinterest-dl");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("pin")
        .setDescription("Fetch images from Pinterest by topic")
        .addSubcommand(sub =>
            sub.setName("images")
                .setDescription("Fetch Pinterest images by topic")
                .addStringOption(opt =>
                    opt.setName("query")
                        .setDescription("Search topic")
                        .setRequired(true)
                )
        ),

    async execute(context) {
        const { interaction, message, args, isPrefix } = context;
        let query;

        if (isPrefix) {
            query = args.slice(1).join(" ");
            if (!query)
                return message.reply("❌ Usage: `!pin images <topic>`");
        } else {
            if (!interaction.isChatInputCommand()) return;
            query = interaction.options.getString("query");
            await interaction.deferReply().catch(() => {});
        }

        try {
            // Fetch pins
            const pins = await search(query);
            const results = pins
                .map(p => p.image)
                .filter(Boolean)
                .slice(0, 15);

            if (!results.length) {
                const content = `⚠️ No results found for \`${query}\`.`;
                return isPrefix
                    ? message.reply(content)
                    : interaction.editReply({ content }).catch(() => {});
            }

            // Pagination setup
            let index = 0;
            const getEmbed = () =>
                new EmbedBuilder()
                    .setColor("#E60023")
                    .setTitle(`📌 Pinterest Images - ${query}`)
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
            const msg = isPrefix
                ? await message.reply(replyOptions)
                : await interaction.editReply(replyOptions);

            const collector = msg.createMessageComponentCollector({ time: 60_000 });
            collector.on("collect", async (btn) => {
                if (btn.user.id !== (isPrefix ? message.author.id : interaction.user.id))
                    return btn.reply({ content: "⛔ Not for you!", ephemeral: true });

                if (btn.customId === "prev") index = (index - 1 + results.length) % results.length;
                if (btn.customId === "next") index = (index + 1) % results.length;

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
