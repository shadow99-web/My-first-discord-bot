const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const axios = require("axios");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("pin")
        .setDescription("Fetch Pinterest images or clips by topic")
        .addSubcommand(sub =>
            sub
                .setName("images")
                .setDescription("Fetch Pinterest images")
                .addStringOption(opt =>
                    opt
                        .setName("query")
                        .setDescription("Search topic")
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub
                .setName("clips")
                .setDescription("Fetch Pinterest video clips")
                .addStringOption(opt =>
                    opt
                        .setName("query")
                        .setDescription("Search topic")
                        .setRequired(true)
                )
        ),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        const query = interaction.options.getString("query");
        await interaction.deferReply();

        try {
            const isClips = sub === "clips";
            const url = `https://www.pinterest.com/resource/BaseSearchResource/get/?source_url=/search/${isClips ? "videos" : "pins"}/?q=${encodeURIComponent(query)}&data={"options":{"query":"${query}","scope":"pins","field_set_key":"unauth_react","redux_normalize_feed":true},"context":{}}`;

            const { data } = await axios.get(url, {
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
                    "Accept": "application/json, text/plain, */*"
                }
            });

            const pins = data?.resource_response?.data?.results || [];
            let results = [];

            if (isClips) {
                results = pins
                    .map(v => v.videos?.video_list?.V_720P?.url || v.videos?.video_list?.V_480P?.url)
                    .filter(Boolean)
                    .slice(0, 15);
            } else {
                results = pins
                    .map(p => p.images?.orig?.url || p.images?.["564x"]?.url)
                    .filter(Boolean)
                    .slice(0, 15);
            }

            // fallback if no results
            if (!results.length) {
                results = [
                    "https://i.pinimg.com/originals/32/f2/14/32f21475b2e4c8d0d7f1f7b6b07d94b2.jpg",
                    "https://i.pinimg.com/originals/fd/48/37/fd48375b47b54336d2d68f8cbb96b8f0.jpg"
                ];
            }

            let index = 0;

            const getEmbed = () =>
                new EmbedBuilder()
                    .setColor("#E60023")
                    .setTitle(`📌 𝙎𝙃𝘼𝘿𝙊𝙒 ${isClips ? "Clips" : "Images"} - ${query}`)
                    .setImage(results[index])
                    .setFooter({ text: `Result ${index + 1}/${results.length}` });

            const makeButtons = () =>
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId("prev").setLabel("◀️").setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId("next").setLabel("▶️").setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setLabel("Download").setStyle(ButtonStyle.Link).setURL(results[index])
                );

            const msg = await interaction.editReply({ embeds: [getEmbed()], components: [makeButtons()] });

            const collector = msg.createMessageComponentCollector({ time: 90_000 });

            collector.on("collect", async (btn) => {
                if (btn.user.id !== interaction.user.id)
                    return btn.reply({ content: "Not for you!", ephemeral: true });

                if (btn.customId === "prev") index = (index - 1 + results.length) % results.length;
                if (btn.customId === "next") index = (index + 1) % results.length;

                await btn.update({ embeds: [getEmbed()], components: [makeButtons()] });
            });

            collector.on("end", async () => {
                await msg.edit({ components: [] }).catch(() => {});
            });
        } catch (err) {
            console.error("Pinterest Fetch Error:", err.message);
            await interaction.editReply("❌ Failed to fetch Pinterest data. Try again later.");
        }
    }
};
