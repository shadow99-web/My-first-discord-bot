const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require("discord.js");
const fetch = require("node-fetch");

const TENOR_API = process.env.TENOR_API_KEY || "YOUR_TENOR_KEY";
const CLIENT_KEY = "my_gifemoji_bot"; // your bot identifier

module.exports = {
    data: new SlashCommandBuilder()
        .setName("gifemoji")
        .setDescription("Search Tenor GIFs and add them as emojis!")
        .addStringOption(option =>
            option.setName("search")
                .setDescription("Search term (e.g., cat, dance, lol)")
                .setRequired(false)
        ),

    async execute(interaction) {
        const searchTerm = interaction.options.getString("search") || null;

        // --- Fetch GIFs ---
        let gifs = [];
        if (searchTerm) gifs = await fetchGifs(searchTerm);
        if (!gifs.length) gifs = await fetchGifs("trending"); // fallback

        if (!gifs.length) {
            return interaction.reply({ content: "❌ No GIFs found!", ephemeral: true });
        }

        let index = 0;
        const makeEmbed = () => {
            const gif = gifs[index];
            const gifUrl = gif?.media_formats?.gif?.url || gif?.media_formats?.tinygif?.url;
            return new EmbedBuilder()
                .setTitle(`${searchTerm || "Trending"} GIF (${index + 1}/${gifs.length})`)
                .setImage(gifUrl)
                .setColor("Blue")
                .setFooter({ text: "◀️ Prev | Next ▶️ | ✅ Add as Emoji" });
        };

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("prev").setLabel("◀️").setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId("next").setLabel("▶️").setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId("add").setLabel("✅ Add").setStyle(ButtonStyle.Success)
        );

        const msg = await interaction.reply({ embeds: [makeEmbed()], components: [row], fetchReply: true });

        // --- Collector (like Choo Choo Bot) ---
        const collector = msg.createMessageComponentCollector({ time: 180000 });

        collector.on("collect", async btn => {
            if (btn.user.id !== interaction.user.id)
                return btn.reply({ content: "❌ This is not your session!", ephemeral: true });

            if (btn.customId === "prev") {
                index = (index - 1 + gifs.length) % gifs.length;
                return btn.update({ embeds: [makeEmbed()] });
            }

            if (btn.customId === "next") {
                index = (index + 1) % gifs.length;
                return btn.update({ embeds: [makeEmbed()] });
            }

            if (btn.customId === "add") {
                if (!btn.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageEmojisAndStickers))
                    return btn.reply({ content: "❌ I need Manage Emojis permission!", ephemeral: true });

                const gifUrl = gifs[index]?.media_formats?.gif?.url;
                const name = (searchTerm || "emoji").replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase();

                try {
                    const emoji = await btn.guild.emojis.create({ attachment: gifUrl, name });
                    await btn.reply({ content: `✅ Emoji added: <:${emoji.name}:${emoji.id}>` });
                    // Optional: register share with Tenor
                    fetch(`https://tenor.googleapis.com/v2/registershare?id=${gifs[index].id}&key=${TENOR_API}&client_key=${CLIENT_KEY}&q=${searchTerm}`).catch(() => {});
                } catch (err) {
                    console.error(err);
                    await btn.reply({ content: "❌ Failed to add emoji (too large or server full).", ephemeral: true });
                }
            }
        });

        collector.on("end", async () => {
            try { await msg.edit({ components: [] }); } catch {}
        });

        // --- Helper: fetch GIFs ---
        async function fetchGifs(term, limit = 10) {
            const url = `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(term)}&key=${TENOR_API}&client_key=${CLIENT_KEY}&limit=${limit}`;
            try {
                const res = await fetch(url);
                const data = await res.json();
                return data.results || [];
            } catch (err) {
                console.error("❌ Tenor fetch failed:", err);
                return [];
            }
        }
    }
};
