const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const puppeteer = require("puppeteer");

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

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        const query = interaction.options.getString("query");
        await interaction.deferReply();

        try {
            const browser = await puppeteer.launch({ headless: "new" });
            const page = await browser.newPage();
            const url = `https://www.pinterest.com/search/${sub === "clips" ? "videos" : "pins"}/?q=${encodeURIComponent(query)}`;
            await page.goto(url, { waitUntil: "networkidle2" });

            const results = await page.evaluate(() => {
                const pins = [];
                const elements = document.querySelectorAll("img[srcset]");
                elements.forEach(img => {
                    const src = img.src;
                    if (src && !pins.includes(src)) pins.push(src);
                });
                return pins.slice(0, 15);
            });

            await browser.close();

            if (!results.length)
                return interaction.editReply({ content: "⚠️ No results found!" });

            // Pagination Setup
            let index = 0;
            const getEmbed = () =>
                new EmbedBuilder()
                    .setColor("#E60023")
                    .setTitle(`📌 Pinterest ${sub === "clips" ? "Clips" : "Images"} - ${query}`)
                    .setImage(results[index])
                    .setFooter({ text: `Result ${index + 1}/${results.length}` });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId("prev").setLabel("◀️").setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId("next").setLabel("▶️").setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setLabel("Download").setStyle(ButtonStyle.Link).setURL(results[index])
            );

            const msg = await interaction.editReply({ embeds: [getEmbed()], components: [row] });
            const collector = msg.createMessageComponentCollector({ time: 60_000 });

            collector.on("collect", async (btn) => {
                if (btn.user.id !== interaction.user.id) return btn.reply({ content: "Not for you!", ephemeral: true });

                if (btn.customId === "prev") index = (index - 1 + results.length) % results.length;
                if (btn.customId === "next") index = (index + 1) % results.length;

                const newRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId("prev").setLabel("◀️").setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId("next").setLabel("▶️").setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setLabel("Download").setStyle(ButtonStyle.Link).setURL(results[index])
                );

                await btn.update({ embeds: [getEmbed()], components: [newRow] });
            });

            collector.on("end", async () => {
                await msg.edit({ components: [] }).catch(() => {});
            });

        } catch (err) {
            console.error(err);
            await interaction.editReply("❌ Failed to fetch  data.");
        }
    }
};
