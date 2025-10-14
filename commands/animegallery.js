const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const axios = require("axios");

// ⚡ Safe fetch utility (with retry + proxy fallback)
async function safeFetch(url, retries = 2) {
    for (let i = 0; i < retries; i++) {
        try {
            const { data } = await axios.get(url, { timeout: 10000 });
            return data;
        } catch (err) {
            console.warn(`⚠️ Fetch attempt ${i + 1} failed: ${err.message}`);
            if (i === retries - 1) {
                console.log("➡️ Trying proxy fallback...");
                try {
                    const proxyUrl = `https://r.jina.ai/${url}`; // proxy bypass
                    const { data } = await axios.get(proxyUrl, { timeout: 15000 });
                    return data;
                } catch (proxyErr) {
                    throw proxyErr;
                }
            }
        }
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("animegallery")
        .setDescription("Browse anime character images by name (gallery mode)")
        .addStringOption(opt =>
            opt.setName("name")
                .setDescription("Enter anime character name")
                .setRequired(true)
        ),

    name: "animegallery",
    aliases: ["agallery", "acharimg", "anicharimg"],

    async execute(context) {
        const interaction = context.interaction;
        const message = context.message;

        const query = context.isPrefix
            ? context.args.join(" ")
            : interaction.options.getString("name");

        if (!query) {
            const msg = "❌ Please provide a character name!";
            return context.isPrefix ? message.reply(msg) : interaction.reply(msg);
        }

        try {
            // ✅ Use Jikan API (safe fetch)
            const apiUrl = `https://api.jikan.moe/v4/characters?q=${encodeURIComponent(query)}&limit=10`;
            const data = await safeFetch(apiUrl);

            if (!data.data || !Array.isArray(data.data) || data.data.length === 0) {
                const msg = `❌ No character found with name **${query}**`;
                return context.isPrefix ? message.reply(msg) : interaction.reply(msg);
            }

            let page = 0;

            const buildEmbed = (char, index) =>
                new EmbedBuilder()
                    .setTitle(`✨ ${char.name}`)
                    .setURL(char.url)
                    .setImage(char.images?.jpg?.image_url || null)
                    .setColor("Purple")
                    .setFooter({ text: `Result ${index + 1}/${data.data.length} | Source: Jikan API` });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId("prev").setLabel("⬅️ Previous").setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId("next").setLabel("➡️ Next").setStyle(ButtonStyle.Primary)
            );

            let msg;
            if (context.isPrefix) {
                msg = await message.reply({ embeds: [buildEmbed(data.data[page], page)], components: [row] });
            } else {
                msg = await interaction.reply({ embeds: [buildEmbed(data.data[page], page)], components: [row], fetchReply: true });
            }

            const filter = (i) => i.user.id === (context.isPrefix ? message.author.id : interaction.user.id);
            const collector = msg.createMessageComponentCollector({ filter, time: 60000 });

            collector.on("collect", async (i) => {
                if (i.customId === "prev") page = (page - 1 + data.data.length) % data.data.length;
                if (i.customId === "next") page = (page + 1) % data.data.length;
                await i.update({ embeds: [buildEmbed(data.data[page], page)], components: [row] });
            });

            collector.on("end", async () => {
                try { await msg.edit({ components: [] }); } catch {}
            });

        } catch (err) {
            console.error("❌ AnimeGallery Error:", err.message);
            const msg = "⚠️ Error fetching gallery. Try again later.";
            return context.isPrefix ? message.reply(msg) : interaction.reply(msg);
        }
    }
};
