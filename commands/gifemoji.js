const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    PermissionsBitField,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require("discord.js");
const fs = require("fs");
const path = require("path");
const https = require("https");

// Optional API keys (fallback to Tenor demo)
const GIPHY_API = process.env.GIPHY_API_KEY;
const TENOR_KEY = process.env.TENOR_KEY || "LIVDSRZULELA";

module.exports = {
    name: "gifemoji",
    description: "Search GIFs/images and add them as emojis or stickers (prefix + slash)",
    aliases: ["gifmoji", "gif2emoji"],

    data: new SlashCommandBuilder()
        .setName("gifemoji")
        .setDescription("Search GIFs/images and add them as emojis or stickers.")
        .addStringOption(opt =>
            opt.setName("search")
                .setDescription("Search term (e.g., dance, cat, happy)")
                .setRequired(true)
        )
        .addStringOption(opt =>
            opt.setName("server_id")
                .setDescription("Optional: Upload to another server")
                .setRequired(false)
        ),

    async execute(ctx) {
        const isSlash = !!ctx.isChatInputCommand;
        const user = isSlash ? ctx.user : ctx.author;
        const searchTerm = isSlash
            ? ctx.options.getString("search")
            : ctx.content.split(" ").slice(1).join(" ");
        const targetServerId = isSlash ? ctx.options.getString("server_id") : null;

        if (!searchTerm) {
            const msg = "❌ Please provide a search term!";
            return isSlash
                ? ctx.reply({ content: msg, flags: 64 })
                : ctx.reply(msg);
        }

        const gifs = await fetchGifs(searchTerm);
        if (!gifs.length) {
            const msg = `❌ No GIFs found for **"${searchTerm}"**.`;
            return isSlash
                ? ctx.reply({ content: msg, flags: 64 })
                : ctx.reply(msg);
        }

        let index = 0;
        const makeEmbed = (gif) =>
            new EmbedBuilder()
                .setTitle(`GIF for "${searchTerm}" (${index + 1}/${gifs.length})`)
                .setImage(gif)
                .setColor("Blue")
                .setFooter({ text: "Choose to add as emoji or sticker." });

        const makeButtons = (disabled = false) =>
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId("prev")
                    .setLabel("◀️ Prev")
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(disabled),
                new ButtonBuilder()
                    .setCustomId("next")
                    .setLabel("Next ▶️")
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(disabled)
            );

        const menuRow = (disabled = false) =>
            new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId("add-type")
                    .setPlaceholder("Choose upload type")
                    .setDisabled(disabled)
                    .addOptions([
                        {
                            label: "Add as Emoji",
                            description: "Upload this as an emoji",
                            value: "emoji",
                            emoji: "😄"
                        },
                        {
                            label: "Add as Sticker",
                            description: "Upload this as a sticker",
                            value: "sticker",
                            emoji: "🎟️"
                        }
                    ])
            );

        const msg = isSlash
            ? await ctx.reply({
                  embeds: [makeEmbed(gifs[index])],
                  components: [makeButtons(), menuRow()],
                  fetchReply: true
              })
            : await ctx.channel.send({
                  embeds: [makeEmbed(gifs[index])],
                  components: [makeButtons(), menuRow()]
              });

        const collector = msg.createMessageComponentCollector({
            filter: (i) => i.user.id === user.id,
            time: 180000
        });

        collector.on("collect", async (btn) => {
            if (btn.customId === "prev" || btn.customId === "next") {
                index =
                    btn.customId === "next"
                        ? (index + 1) % gifs.length
                        : (index - 1 + gifs.length) % gifs.length;
                return btn.update({ embeds: [makeEmbed(gifs[index])] });
            }

            if (btn.customId === "add-type") {
                const choice = btn.values[0];
                const gifUrl = gifs[index];
                const targetGuild = targetServerId
                    ? btn.client.guilds.cache.get(targetServerId)
                    : btn.guild;

                if (!targetGuild)
                    return btn.reply({ content: "❌ Invalid or inaccessible server ID.", flags: 64 });

                const modal = new ModalBuilder()
                    .setCustomId(`gifemoji-modal-${btn.id}`)
                    .setTitle(`Name your ${choice}`);

                const nameInput = new TextInputBuilder()
                    .setCustomId("name")
                    .setLabel(`Enter ${choice} name`)
                    .setPlaceholder("letters, numbers, underscores only")
                    .setStyle(TextInputStyle.Short)
                    .setMinLength(2)
                    .setMaxLength(32)
                    .setRequired(true);

                modal.addComponents(new ActionRowBuilder().addComponents(nameInput));
                await btn.showModal(modal);

                try {
                    const modalSubmit = await btn.awaitModalSubmit({
                        filter: (i) => i.customId === `gifemoji-modal-${btn.id}`,
                        time: 60000
                    });

                    const name = modalSubmit.fields.getTextInputValue("name").replace(/[^a-zA-Z0-9_]/g, "");

                    if (
                        !targetGuild.members.me.permissions.has(
                            PermissionsBitField.Flags.ManageEmojisAndStickers
                        )
                    ) {
                        return modalSubmit.reply({
                            content: "❌ Missing `Manage Emojis & Stickers` permission!",
                            flags: 64
                        });
                    }

                    if (choice === "emoji") {
                        const emoji = await targetGuild.emojis.create({
                            attachment: gifUrl,
                            name
                        });

                        await modalSubmit.update({
                            embeds: [
                                new EmbedBuilder()
                                    .setTitle("✅ Emoji Added!")
                                    .setDescription(`Created ${emoji} in **${targetGuild.name}**`)
                                    .setThumbnail(gifUrl)
                                    .setColor("Green")
                            ],
                            components: []
                        });
                    } else if (choice === "sticker") {
                        const tempFile = path.join("/tmp", `sticker_${Date.now()}.png`);
                        await downloadFile(gifUrl, tempFile);

                        await targetGuild.stickers.create({
                            file: tempFile,
                            name,
                            description: `Sticker by ${user.username}`,
                            tags: "fun"
                        });

                        fs.unlink(tempFile, () => {}); // 🔥 Auto-delete temp file

                        await modalSubmit.update({
                            embeds: [
                                new EmbedBuilder()
                                    .setTitle("🎟️ Sticker Added!")
                                    .setDescription(`Sticker added to **${targetGuild.name}**`)
                                    .setThumbnail(gifUrl)
                                    .setColor("Orange")
                            ],
                            components: []
                        });
                    }

                    collector.stop();
                } catch (err) {
                    console.error("Add failed:", err);
                    await ctx.editReply({
                        embeds: [
                            new EmbedBuilder()
                                .setTitle("❌ Operation Failed")
                                .setDescription("Timeout, permission issue, or upload failure.")
                                .setColor("Red")
                        ],
                        components: [makeButtons(true), menuRow(true)]
                    });
                }
            }
        });

        collector.on("end", () => {
            msg.edit({ components: [makeButtons(true), menuRow(true)] }).catch(() => {});
        });
    }
};

// --- Fetch GIFs from Giphy or Tenor ---
async function fetchGifs(term) {
    try {
        if (GIPHY_API && GIPHY_API !== "YOUR_GIPHY_KEY") {
            const giphyUrl = `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API}&q=${encodeURIComponent(
                term
            )}&limit=20&rating=pg`;
            const res = await fetch(giphyUrl);
            const json = await res.json();
            return json.data.map((g) => g.images.original.url);
        } else {
            const tenorUrl = `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(
                term
            )}&key=${TENOR_KEY}&limit=20`;
            const res = await fetch(tenorUrl);
            const json = await res.json();
            return json.results.map((r) => r.media_formats.gif.url);
        }
    } catch (err) {
        console.error("GIF Fetch Error:", err);
        return [];
    }
}

// --- Download temporary image for sticker ---
function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https.get(url, (res) => {
            res.pipe(file);
            file.on("finish", () => file.close(resolve));
        }).on("error", (err) => {
            fs.unlink(dest, () => {});
            reject(err);
        });
    });
                                  }
