const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require("discord.js");
const axios = require("axios");

const BLUE_HEART = "<a:blueheart:1414309560231002194>";

// Clean search text
function cleanQuery(q) {
    return q.replace(/\s+/g, " ").trim();
}

// Split lyrics into pages
function paginate(text, size = 1800) {
    const pages = [];
    for (let i = 0; i < text.length; i += size) {
        pages.push(text.substring(i, i + size));
    }
    return pages;
}

// Auto-detect artist & title + fetch lyrics
async function fetchLyrics(query) {
    try {
        // ――― Detect YouTube URL title ―――
        if (query.startsWith("http")) {
            const info = await axios.get(`https://noembed.com/embed?url=${query}`);
            if (info?.data?.title) query = info.data.title;
        }

        let artist = "";
        let title = "";

        // ――― If query contains "-" split into artist - song ―――
        if (query.includes("-")) {
            const parts = query.split("-");
            artist = parts[0].trim();
            title = parts[1].trim();
        } else {
            // ――― Try to guess artist/title via DuckDuckGo ―――
            const s = await axios.get(
                `https://api.duckduckgo.com/?q=${encodeURIComponent(query + " song")}&format=json`
            );
            const result = s.data?.Heading || query;

            if (result.includes("-")) {
                const parts = result.split("-");
                artist = parts[0].trim();
                title = parts[1].trim();
            } else {
                title = query;
            }
        }

        // ――― Fetch lyrics via Lyrics.ovh ―――
        const lyr = await axios.get(
            `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`
        );

        if (!lyr.data || !lyr.data.lyrics) return null;

        return {
            title: title || "Unknown",
            artist: artist || "Unknown",
            lyrics: lyr.data.lyrics,
        };

    } catch (err) {
        return null;
    }
}

// Detect song from Spotify / Wavelink
async function detectNowPlaying(interaction, client) {
    const user = interaction.member;

    const spotify = user.presence?.activities?.find(a => a.name === "Spotify");
    if (spotify) return `${spotify.details} - ${spotify.state}`;

    const player = client.music?.players?.get(interaction.guild.id);
    if (player && player.current) return player.current.title;

    return null;
}

module.exports = {
    name: "lyrics",
    aliases: ["lyric", "songlyrics"],

    data: new SlashCommandBuilder()
        .setName("lyrics")
        .setDescription("Fetch song lyrics")
        .addSubcommand(sub =>
            sub
                .setName("search")
                .setDescription("Search lyrics by song name or URL")
                .addStringOption(opt =>
                    opt
                        .setName("song")
                        .setDescription("Song name or YouTube/Spotify URL")
                        .setRequired(true)
                        .setAutocomplete(true)
                )
        )
        .addSubcommand(sub =>
            sub
                .setName("nowplaying")
                .setDescription("Fetch lyrics of the currently playing song")
        ),

    // ――― Autocomplete ―――
    async autocomplete(interaction) {
        const focused = interaction.options.getFocused(true).value;

        if (!focused || focused.length < 2)
            return interaction.respond([]);

        const q = cleanQuery(focused);

        return interaction.respond([
            { name: `${q} (Original)`, value: q },
            { name: `${q} - Arijit Singh`, value: `${q} - Arijit Singh` },
            { name: `${q} - Jubin Nautiyal`, value: `${q} - Jubin Nautiyal` },
            { name: `${q} Remix`, value: `${q} Remix` },
        ]);
    },

    async execute({ interaction, client, message, args }) {
        const isSlash = !!interaction;
        let query;

        // ――― Slash: /lyrics search ―――
        if (isSlash && interaction.options.getSubcommand() === "search") {
            query = interaction.options.getString("song");
        }

        // ――― Slash: /lyrics nowplaying ―――
        if (isSlash && interaction.options.getSubcommand() === "nowplaying") {
            query = await detectNowPlaying(interaction, client);
            if (!query) return interaction.reply({ content: "❌ No active song detected.", flags: 64 });
        }

        // ――― Prefix: !lyrics <song> ―――
        if (!isSlash) query = args.join(" ");

        if (!query)
            return (isSlash
                ? interaction.reply({ content: "❌ Provide a song name or URL", flags: 64 })
                : message.reply("❌ Provide a song name or URL")
            );

        // ――― Fetching Animation ―――
        const loading = "💙 Fetching lyrics...";
        if (isSlash) await interaction.reply({ content: loading, flags: 64 });
        else await message.reply(loading);

        const data = await fetchLyrics(query);
        if (!data)
            return (isSlash
                ? interaction.editReply("❌ Lyrics not found.")
                : message.reply("❌ Lyrics not found.")
            );

        const pages = paginate(data.lyrics);
        let page = 0;

        const embed = new EmbedBuilder()
            .setColor("Blue")
            .setTitle(`${BLUE_HEART} ${data.title} — ${data.artist}`)
            .setDescription(pages[page])
            .setFooter({ text: `Page ${page + 1}/${pages.length}` });

        const buttons = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("prev").setEmoji("◀️").setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId("next").setEmoji("▶️").setStyle(ButtonStyle.Secondary),
        );

        const replyMsg = isSlash
            ? await interaction.editReply({ embeds: [embed], components: [buttons] })
            : await message.channel.send({ embeds: [embed], components: [buttons] });

        const collector = replyMsg.createMessageComponentCollector({ time: 60000 });

        collector.on("collect", async btn => {
            if (btn.customId === "prev") page = Math.max(page - 1, 0);
            if (btn.customId === "next") page = Math.min(page + 1, pages.length - 1);

            embed.setDescription(pages[page]);
            embed.setFooter({ text: `Page ${page + 1}/${pages.length}` });

            await btn.update({ embeds: [embed], components: [buttons] });
        });

        collector.on("end", () => {
            replyMsg.edit({ components: [] }).catch(() => {});
        });
    },
};
