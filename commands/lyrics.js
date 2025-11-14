const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    PermissionFlagsBits,
} = require("discord.js");
const axios = require("axios");

// Your 💙 animated heart emoji name or ID
const BLUE_HEART = "<a:blueheart:1414309560231002194>"; 

// Genius API (use any API you want)
const GENIUS_API = "https://somepubliclyricsapi.com/search?q=";

// Clean query
function cleanQuery(q) {
    return q.replace(/\s+/g, " ").trim();
}

// Fetch lyrics
async function fetchLyrics(query) {
    try {
        const res = await axios.get(GENIUS_API + encodeURIComponent(query));
        if (!res.data || !res.data.lyrics) return null;
        return res.data;
    } catch {
        return null;
    }
}

// Chunk text into pages
function paginate(text, size = 4000) {
    const pages = [];
    for (let i = 0; i < text.length; i += size) {
        pages.push(text.slice(i, i + size));
    }
    return pages;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("lyrics")
        .setDescription("Fetch song lyrics")
        .addStringOption(opt =>
            opt.setName("song")
                .setDescription("Song name or URL")
                .setAutocomplete(true)
        )
        .addSubcommand(sc =>
            sc.setName("nowplaying")
                .setDescription("Fetch lyrics for the song you're listening to")
        ),

    name: "lyrics",
    aliases: ["lyric", "songlyrics"],

    // 🔷 Autocomplete Support
    async autocomplete(interaction, client) {
        const focused = interaction.options.getFocused(true).value;

        if (!focused || focused.length < 2) {
            return interaction.respond([]);
        }

        const query = cleanQuery(focused);

        // Example suggestion logic
        const suggestions = [
            { name: `${query} - Ed Sheeran`, value: `${query} Ed Sheeran` },
            { name: `${query} (Acoustic)`, value: `${query} Acoustic` },
            { name: `${query} Remix`, value: `${query} Remix` },
        ];

        interaction.respond(suggestions.slice(0, 5));
    },

    async execute({ interaction, message, client, args }) {
        const isSlash = !!interaction;

        let query;

        // Slash command: /lyrics song:
        if (isSlash && interaction.options.getSubcommand(false) !== "nowplaying") {
            query = interaction.options.getString("song");
        }

        // Prefix command: !lyrics
        if (!isSlash) {
            query = args.join(" ");
        }

        // 🔷 /lyrics nowplaying
        if (isSlash && interaction.options.getSubcommand(false) === "nowplaying") {
            query = await detectNowPlaying(interaction, client);
            if (!query) {
                return interaction.reply({ content: "❌ No active song detected!", flags: 64 });
            }
        }

        if (!query) {
            const msg = "❌ Please provide a song name or URL!";
            return isSlash ? interaction.reply({ content: msg, flags: 64 }) : message.reply(msg);
        }

        // Detect if URL → auto extract title
        query = await handleURL(query);

        await (isSlash
            ? interaction.reply({ content: "💙 Fetching lyrics...", flags: 64 })
            : message.reply("💙 Fetching lyrics...")
        );

        const data = await fetchLyrics(query);

        if (!data || !data.lyrics) {
            return isSlash
                ? interaction.editReply("❌ Lyrics not found.")
                : message.reply("❌ Lyrics not found.");
        }

        const pages = paginate(data.lyrics, 2000);

        let page = 0;

        const embed = new EmbedBuilder()
            .setColor("Blue")
            .setTitle(`${BLUE_HEART} ${data.title} - ${data.artist}`)
            .setDescription(pages[page])
            .setThumbnail(data.thumbnail || null)
            .setFooter({ text: `Page ${page + 1} / ${pages.length}` });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("prev")
                .setEmoji("◀️")
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId("next")
                .setEmoji("▶️")
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setLabel("YouTube")
                .setStyle(ButtonStyle.Link)
                .setURL(data.youtube || "https://youtube.com"),
            new ButtonBuilder()
                .setLabel("Spotify")
                .setStyle(ButtonStyle.Link)
                .setURL(data.spotify || "https://spotify.com")
        );

        const msg = isSlash
            ? await interaction.editReply({ embeds: [embed], components: [row] })
            : await message.channel.send({ embeds: [embed], components: [row] });

        const collector = msg.createMessageComponentCollector({ time: 60000 });

        collector.on("collect", async btn => {
            if (btn.customId === "prev") page = page > 0 ? page - 1 : 0;
            if (btn.customId === "next") page = page < pages.length - 1 ? page + 1 : pages.length - 1;

            embed.setDescription(pages[page]);
            embed.setFooter({ text: `Page ${page + 1} / ${pages.length}` });

            await btn.update({ embeds: [embed], components: [row] });
        });

        collector.on("end", () => {
            msg.edit({ components: [] }).catch(() => {});
        });
    }
};

// 🔷 Detect song from Spotify status or VC music bot
async function detectNowPlaying(interaction, client) {
    const user = interaction.member;

    // User's Spotify status
    const spotify = user.presence?.activities?.find(a => a.name === "Spotify");
    if (spotify) {
        return `${spotify.details} ${spotify.state}`;
    }

    // VC music bot now playing (Lavalink/Wavelink/etc)
    const player = client.music?.players?.get(interaction.guild.id);
    if (player && player.current) return player.current.title;

    return null;
}

// 🔷 Extract song title from YouTube/Spotify URL
async function handleURL(url) {
    if (!url.startsWith("http")) return url;

    // Example: YouTube title fetch for URLs
    try {
        const info = await axios.get(`https://noembed.com/embed?url=${url}`);
        return info.data.title || url;
    } catch {
        return url;
    }
}
