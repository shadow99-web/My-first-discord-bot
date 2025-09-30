const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require("discord.js");
const { createCanvas, loadImage } = require("canvas");

const TENOR_API = process.env.TENOR_API_KEY || "YOUR_TENOR_KEY";

// Safe reply function
async function safeReply(interaction, options) {
    try {
        if (interaction.replied) return interaction.followUp(options).catch(() => {});
        if (interaction.deferred) return interaction.editReply(options).catch(() => {});
        return interaction.reply(options).catch(() => {});
    } catch (e) {
        console.error("❌ safeReply error:", e);
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("gifemoji")
        .setDescription("Search Tenor GIFs and add them as emojis!")
        .addStringOption(option =>
            option.setName("search")
                .setDescription("Search term (e.g., cat, dance, lol)")
                .setRequired(true)
        ),

    async execute(context) {
        const search = context.isPrefix ? context.args.join(" ") : context.interaction.options.getString("search");
        if (!search) {
            const msg = "❌ Provide a search term!";
            if (context.isPrefix) return context.message.reply(msg);
            else return safeReply(context.interaction, { content: msg, ephemeral: true });
        }

        // Prepare search term for Tenor API
        const searchTerm = encodeURIComponent(search.trim().replace(/\s+/g, "+"));
        const url = `https://tenor.googleapis.com/v2/search?key=${TENOR_API}&q=${searchTerm}&limit=10&media_filter=gif&contentfilter=high&locale=en_US&client_key=discordbot`;

        // Fetch GIFs
        let data;
        try {
            const res = await fetch(url);
            data = await res.json();
        } catch (err) {
            console.error("❌ Tenor fetch failed:", err);
            const msg = "❌ Failed to fetch GIFs.";
            if (context.isPrefix) return context.message.reply(msg);
            else return safeReply(context.interaction, { content: msg, ephemeral: true });
        }

        if (!data.results?.length) {
            const msg = "❌ No GIFs found!";
            if (context.isPrefix) return context.message.reply(msg);
            else return safeReply(context.interaction, { content: msg, ephemeral: true });
        }

        let index = 0;
        const results = data.results;

        const makeEmbed = () => new EmbedBuilder()
            .setColor("Blue")
            .setTitle(`Result ${index + 1}/${results.length}`)
            .setImage(results[index].media_formats.gif.url)
            .setFooter({ text: "◀️ Previous | Next ▶️ | ✅ Add as emoji" });

        const replyTarget = context.isPrefix ? context.message : context.interaction;
        const msg = await replyTarget.reply({
            embeds: [makeEmbed()],
            components: [
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId("prev").setLabel("◀️").setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId("next").setLabel("▶️").setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId("add").setLabel("✅ Add").setStyle(ButtonStyle.Success)
                ),
            ],
        });

        const collector = msg.createMessageComponentCollector({ time: 180000 });

        collector.on("collect", async (btn) => {
            const userId = context.isPrefix ? context.message.author.id : context.interaction.user.id;
            if (btn.user.id !== userId) return btn.reply({ content: "❌ This is not your session!", ephemeral: true });

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

                const url = results[index].media_formats.gif.url;
                const name = search.replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase();

                try {
                    const image = await loadImage(url);
                    let size = 128;
                    let added = false;

                    while (size >= 32 && !added) {
                        try {
                            const canvas = createCanvas(size, size);
                            const ctx = canvas.getContext("2d");
                            ctx.drawImage(image, 0, 0, size, size);
                            const buffer = canvas.toBuffer("image/webp");

                            const emoji = await btn.guild.emojis.create({ attachment: buffer, name });
                            await btn.reply({ content: `✅ Emoji added: <:${emoji.name}:${emoji.id}>` });
                            added = true;
                        } catch {
                            size = Math.floor(size / 2);
                        }
                    }

                    if (!added) throw new Error("Failed to add emoji.");
                } catch (err) {
                    console.error(err);
                    await btn.reply({ content: "❌ Failed to add emoji (too large or server full).", ephemeral: true });
                }
            }
        });

        collector.on("end", async () => {
            try { await msg.edit({ components: [] }); } catch {}
        });
    }
};
