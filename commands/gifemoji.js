// gifemoji.js
const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    PermissionsBitField,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require("discord.js");
const fetch = require("node-fetch");

// Load Giphy API key from environment
const GIPHY_API = process.env.GIPHY_API_KEY || "YOUR_GIPHY_KEY";

module.exports = {
    data: new SlashCommandBuilder()
        .setName("gifemoji")
        .setDescription("Search Giphy GIFs and add them as emojis!")
        .addStringOption(option =>
            option.setName("search")
                .setDescription("Search term (e.g., cat, dance, lol)")
                .setRequired(true)
        ),

    async execute(interaction) {
        const searchTerm = interaction.options.getString("search");
        const gifs = await fetchGifs(searchTerm);

        if (!gifs.length) {
            return interaction.reply({ content: `❌ No GIFs found for "${searchTerm}"!`, flags: 64 });
        }

        let index = 0;

        const makeEmbed = (gif) => {
            const gifUrl = gif?.images?.downsized?.url || gif?.images?.fixed_height_small?.url;
            return new EmbedBuilder()
                .setTitle(`GIF for "${searchTerm}" (${index + 1}/${gifs.length})`)
                .setImage(gifUrl)
                .setColor("Blue")
                .setFooter({ text: "Use the buttons to browse and add an emoji." });
        };

        const makeButtons = (disabled = false) => {
            return new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId("prev").setLabel("◀️ Prev").setStyle(ButtonStyle.Primary).setDisabled(disabled),
                new ButtonBuilder().setCustomId("next").setLabel("Next ▶️").setStyle(ButtonStyle.Primary).setDisabled(disabled),
                new ButtonBuilder().setCustomId("add").setLabel("✅ Add Emoji").setStyle(ButtonStyle.Success).setDisabled(disabled)
            );
        };

        const reply = await interaction.reply({
            embeds: [makeEmbed(gifs[index])],
            components: [makeButtons()],
            fetchReply: true
        });

        const collector = reply.createMessageComponentCollector({
            filter: i => i.user.id === interaction.user.id,
            time: 180000
        });

        collector.on("collect", async btn => {
            if (btn.customId === "prev" || btn.customId === "next") {
                index = (btn.customId === "next")
                    ? (index + 1) % gifs.length
                    : (index - 1 + gifs.length) % gifs.length;
                return btn.update({ embeds: [makeEmbed(gifs[index])] });
            }

            if (btn.customId === "add") {
                if (!btn.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageEmojisAndStickers)) {
                    await btn.reply({ content: "❌ I don't have the `Manage Emojis & Stickers` permission!", flags: 64 });
                    return collector.stop();
                }
                if (!btn.member.permissions.has(PermissionsBitField.Flags.ManageEmojisAndStickers)) {
                    return btn.reply({ content: "❌ You don't have permission to add emojis.", flags: 64 });
                }

                const modal = new ModalBuilder()
                    .setCustomId(`gifemoji-modal-${btn.id}`)
                    .setTitle("Name Your Emoji");

                const nameInput = new TextInputBuilder()
                    .setCustomId('emojiName')
                    .setLabel("What should the emoji be called?")
                    .setPlaceholder("letters, numbers, underscores only")
                    .setStyle(TextInputStyle.Short)
                    .setMinLength(2)
                    .setMaxLength(32)
                    .setRequired(true);

                modal.addComponents(new ActionRowBuilder().addComponents(nameInput));
                await btn.showModal(modal);

                try {
                    const modalSubmit = await btn.awaitModalSubmit({
                        filter: i => i.customId === `gifemoji-modal-${btn.id}` && i.user.id === interaction.user.id,
                        time: 60000
                    });

                    const emojiName = modalSubmit.fields.getTextInputValue('emojiName').replace(/[^a-zA-Z0-9_]/g, '');
                    const gifUrl = gifs[index]?.images?.downsized?.url || gifs[index]?.images?.fixed_height_small?.url;

                    const emoji = await btn.guild.emojis.create({ attachment: gifUrl, name: emojiName });

                    const successEmbed = new EmbedBuilder()
                        .setTitle("✅ Emoji Added!")
                        .setColor("Green")
                        .setDescription(`Successfully created the ${emoji} emoji!`)
                        .setThumbnail(gifUrl);

                    await modalSubmit.update({ embeds: [successEmbed], components: [] });
                    collector.stop();
                } catch (err) {
                    console.error(err);
                    const failEmbed = new EmbedBuilder()
                        .setTitle("❌ Failed to Add Emoji")
                        .setColor("Red")
                        .setDescription("Could not add the emoji. Likely because:\n- The GIF is over 256KB\n- The server is full\n- The name is taken\n- Timeout waiting for name input");
                    await interaction.editReply({ embeds: [failEmbed], components: [makeButtons(true)] });
                }
            }
        });

        collector.on("end", () => {
            interaction.editReply({ components: [makeButtons(true)] }).catch(() => {});
        });
    }
};

// --- Helper: fetch GIFs from Giphy ---
async function fetchGifs(term, limit = 20) {
    const url = `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API}&q=${encodeURIComponent(term)}&limit=${limit}&rating=pg-13`;
    try {
        const res = await fetch(url);
        const data = await res.json();
        return data.data || [];
    } catch (err) {
        console.error("❌ Giphy fetch failed:", err);
        return [];
    }
}
