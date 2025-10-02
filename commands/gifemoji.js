const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require("discord.js");
const fetch = require("node-fetch");

const TENOR_API = process.env.TENOR_API_KEY || "YOUR_TENOR_KEY";
const CLIENT_KEY = "my_gifemoji_bot"; // your bot identifier

async function safeReply(interaction, options) {
    try {
        if (interaction.replied) return interaction.followUp(options).catch(() => {});
        if (interaction.deferred) return interaction.editReply(options).catch(() => {});
        return interaction.reply(options).catch(() => {});
    } catch (e) {
        console.error("❌ safeReply error:", e);
    }
}

// fetch GIFs from Tenor v2
async function fetchGifs(term, limit = 10) {
    const url = `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(term)}&key=${TENOR_API}&client_key=${CLIENT_KEY}&limit=${limit}&media_filter=gif&contentfilter=high&locale=en_US`;
    try {
        const res = await fetch(url);
        const data = await res.json();
        return data.results || [];
    } catch (err) {
        console.error("❌ Tenor fetch failed:", err);
        return [];
    }
}

// fetch trending GIFs
async function fetchTrending(limit = 10) {
    const url = `https://tenor.googleapis.com/v2/featured?key=${TENOR_API}&client_key=${CLIENT_KEY}&limit=${limit}`;
    try {
        const res = await fetch(url);
        const data = await res.json();
        return data.results || [];
    } catch (err) {
        console.error("❌ Tenor trending fetch failed:", err);
        return [];
    }
}

// fetch categories
async function fetchCategories() {
    const url = `https://tenor.googleapis.com/v2/categories?key=${TENOR_API}&client_key=${CLIENT_KEY}`;
    try {
        const res = await fetch(url);
        const data = await res.json();
        return data.tags || [];
    } catch (err) {
        console.error("❌ Tenor categories fetch failed:", err);
        return [];
    }
}

// fetch search suggestions
async function fetchSuggestions(term, limit = 5) {
    const url = `https://tenor.googleapis.com/v2/search_suggestions?key=${TENOR_API}&client_key=${CLIENT_KEY}&q=${encodeURIComponent(term)}&limit=${limit}`;
    try {
        const res = await fetch(url);
        const data = await res.json();
        return data.results || [];
    } catch (err) {
        console.error("❌ Tenor autocomplete fetch failed:", err);
        return [];
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("gifemoji")
        .setDescription("Search Tenor GIFs and add them as emojis!")
        .addStringOption(option =>
            option.setName("search")
                .setDescription("Search term (e.g., cat, dance, lol)")
                .setRequired(false)
        ),

    async execute(context) {
        const interaction = context.interaction;
        let searchTerm = interaction.options.getString("search") || null;
        let results = [];
        let categories = [];

        // Step 1: search GIFs
        if (searchTerm) results = await fetchGifs(searchTerm, 10);

        // Step 2: fallback to trending if no results
        if (!results.length) {
            results = await fetchTrending(10);
            searchTerm = "Trending GIFs";
        }

        // Step 3: fallback to categories if still nothing
        if (!results.length) {
            categories = await fetchCategories();
            if (!categories.length) return safeReply(interaction, { content: "❌ No GIFs or categories found!", ephemeral: true });

            const buttons = categories.slice(0, 5).map(cat =>
                new ButtonBuilder().setLabel(cat.name).setCustomId(`category_${cat.path}`).setStyle(ButtonStyle.Secondary)
            );
            const row = new ActionRowBuilder().addComponents(buttons);
            return safeReply(interaction, { content: "No GIFs found. Select a category:", components: [row], ephemeral: true });
        }

        // Step 4: pagination
        let index = 0;
        const makeEmbed = () => {
            const gifData = results[index];
            const gifUrl = gifData?.media_formats?.gif?.url
                        || gifData?.media_formats?.mediumgif?.url
                        || gifData?.media_formats?.tinygif?.url
                        || null;

            return new EmbedBuilder()
                .setColor("Blue")
                .setTitle(`${searchTerm} (${index + 1}/${results.length})`)
                .setImage(gifUrl)
                .setFooter({ text: "◀️ Previous | Next ▶️ | ✅ Add as emoji" });
        };

        const msg = await interaction.reply({
            embeds: [makeEmbed()],
            components: [
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId("prev").setLabel("◀️").setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId("next").setLabel("▶️").setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId("add").setLabel("✅ Add").setStyle(ButtonStyle.Success)
                )
            ],
            fetchReply: true
        });

        const collector = msg.createMessageComponentCollector({ time: 180000 });

        collector.on("collect", async btn => {
            if (btn.user.id !== interaction.user.id)
                return btn.reply({ content: "❌ This is not your session!", ephemeral: true });

            if (btn.customId === "prev") {
                index = (index - 1 + results.length) % results.length;
                return btn.update({ embeds: [makeEmbed()] });
            }
            if (btn.customId === "next") {
                index = (index + 1) % results.length;
                return btn.update({ embeds: [makeEmbed()] });
            }
            if (btn.customId === "add") {
                if (!btn.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageEmojisAndStickers))
                    return btn.reply({ content: "❌ I need Manage Emojis & Stickers permission.", ephemeral: true });

                const gifData = results[index];
                const gifUrl = gifData?.media_formats?.gif?.url
                            || gifData?.media_formats?.mediumgif?.url
                            || gifData?.media_formats?.tinygif?.url
                            || null;
                const name = searchTerm.replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase();

                try {
                    const emoji = await btn.guild.emojis.create({ attachment: gifUrl, name });
                    await btn.reply({ content: `✅ Emoji added: <:${emoji.name}:${emoji.id}>` });
                    // Optional: register share with Tenor
                    fetch(`https://tenor.googleapis.com/v2/registershare?id=${gifData.id}&key=${TENOR_API}&client_key=${CLIENT_KEY}&q=${searchTerm}`).catch(() => {});
                } catch (err) {
                    console.error(err);
                    await btn.reply({ content: "❌ Failed to add emoji (maybe too large or server full).", ephemeral: true });
                }
            }

            // Dynamic category selection
            if (btn.customId.startsWith("category_")) {
                const catPath = btn.customId.replace("category_", "");
                results = await fetchGifs(catPath, 10);
                searchTerm = catPath;
                index = 0;
                return btn.update({ embeds: [makeEmbed()] });
            }

            // Dynamic suggestion selection
            if (btn.customId.startsWith("suggestion_")) {
                const sugTerm = btn.customId.replace("suggestion_", "");
                results = await fetchGifs(sugTerm, 10);
                searchTerm = sugTerm;
                index = 0;
                return btn.update({ embeds: [makeEmbed()] });
            }
        });

        collector.on("end", async () => {
            try { await msg.edit({ components: [] }); } catch {}
        });

        // Step 5: show autocomplete suggestions
        if (searchTerm && searchTerm !== "Trending GIFs") {
            const suggestions = await fetchSuggestions(searchTerm, 5);
            if (suggestions.length) {
                const suggestionButtons = suggestions.slice(0, 5).map(s =>
                    new ButtonBuilder().setLabel(s).setCustomId(`suggestion_${s}`).setStyle(ButtonStyle.Secondary)
                );
                const row = new ActionRowBuilder().addComponents(suggestionButtons);
                await interaction.followUp({ content: "💡 Did you mean:", components: [row], ephemeral: true });
            }
        }
    }
};
