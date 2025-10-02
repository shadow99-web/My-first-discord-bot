// You will need ModalBuilder and TextInputBuilder for the naming prompt
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField, ModalBuilder, TextInputBuilder, TextInputStyle } = require("discord.js");
const fetch = require("node-fetch");

const TENOR_API = process.env.TENOR_API_KEY || "YOUR_TENOR_KEY";
const CLIENT_KEY = "my_gifemoji_bot";

module.exports = {
    data: new SlashCommandBuilder()
        .setName("gifemoji")
        .setDescription("Search Tenor GIFs and add them as emojis!")
        .addStringOption(option =>
            option.setName("search")
                .setDescription("The search term for the GIF (e.g., cat, dance, lol)")
                .setRequired(false)
        ),

    async execute(interaction) {
        const searchTerm = interaction.options.getString("search") || "trending";

        const gifs = await fetchGifs(searchTerm);

        if (!gifs.length) {
            return interaction.reply({ content: `❌ No GIFs found for "${searchTerm}"!`, ephemeral: true });
        }

        let index = 0;

        const makeEmbed = (gif) => {
            // <-- Prioritize smaller GIF formats to stay under Discord's 256KB limit
            const gifUrl = gif?.media_formats?.nanogif?.url || gif?.media_formats?.tinygif?.url || gif?.media_formats?.gif?.url;
            return new EmbedBuilder()
                .setTitle(`GIF for "${searchTerm}" (${index + 1}/${gifs.length})`)
                .setImage(gifUrl)
                .setColor("Blue")
                .setFooter({ text: "Use the buttons to browse and add an emoji." });
        };

        const makeButtons = (is_disabled = false) => { // <-- Helper to easily disable buttons
            return new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId("prev").setLabel("◀️ Prev").setStyle(ButtonStyle.Primary).setDisabled(is_disabled),
                new ButtonBuilder().setCustomId("next").setLabel("Next ▶️").setStyle(ButtonStyle.Primary).setDisabled(is_disabled),
                new ButtonBuilder().setCustomId("add").setLabel("✅ Add Emoji").setStyle(ButtonStyle.Success).setDisabled(is_disabled)
            );
        };

        const reply = await interaction.reply({
            embeds: [makeEmbed(gifs[index])],
            components: [makeButtons()],
            fetchReply: true
        });

        const collector = reply.createMessageComponentCollector({
            filter: i => i.user.id === interaction.user.id, // <-- Filter here is slightly cleaner
            time: 180000 // 3 minutes
        });

        collector.on("collect", async btn => {
            // No need for user check here due to the filter above

            if (btn.customId === "prev" || btn.customId === "next") {
                index = (btn.customId === "next")
                    ? (index + 1) % gifs.length
                    : (index - 1 + gifs.length) % gifs.length;
                await btn.update({ embeds: [makeEmbed(gifs[index])] });
                return;
            }

            if (btn.customId === "add") {
                // <-- PERMISSION CHECKS -->
                if (!btn.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageEmojisAndStickers)) {
                    await btn.reply({ content: "❌ I don't have the `Manage Emojis & Stickers` permission!", ephemeral: true });
                    return collector.stop();
                }
                if (!btn.member.permissions.has(PermissionsBitField.Flags.ManageEmojisAndStickers)) {
                    return btn.reply({ content: "❌ You don't have permission to add emojis.", ephemeral: true });
                }

                // <-- MODAL FOR EMOJI NAME -->
                const modal = new ModalBuilder()
                    .setCustomId(`gifemoji-modal-${btn.id}`) // Unique ID per interaction
                    .setTitle("Name Your Emoji");

                const nameInput = new TextInputBuilder()
                    .setCustomId('emojiName')
                    .setLabel("What should the emoji be called?")
                    .setPlaceholder("Enter a name (letters, numbers, underscores)")
                    .setStyle(TextInputStyle.Short)
                    .setMinLength(2)
                    .setMaxLength(32)
                    .setRequired(true);

                modal.addComponents(new ActionRowBuilder().addComponents(nameInput));
                await btn.showModal(modal);

                // --- Wait for the modal submission ---
                try {
                    const modalSubmit = await btn.awaitModalSubmit({
                        filter: i => i.customId === `gifemoji-modal-${btn.id}` && i.user.id === interaction.user.id,
                        time: 60000 // 1 minute to respond
                    });

                    const emojiName = modalSubmit.fields.getTextInputValue('emojiName').replace(/[^a-zA-Z0-9_]/g, '');
                    const gifUrl = gifs[index]?.media_formats?.nanogif?.url || gifs[index]?.media_formats?.tinygif?.url || gifs[index]?.media_formats?.gif?.url;

                    const emoji = await btn.guild.emojis.create({ attachment: gifUrl, name: emojiName });

                    // <-- Better feedback: update the original message -->
                    const successEmbed = new EmbedBuilder()
                        .setTitle("✅ Emoji Added!")
                        .setColor("Green")
                        .setDescription(`Successfully created the ${emoji} emoji!`)
                        .setThumbnail(gifUrl);

                    await modalSubmit.update({ embeds: [successEmbed], components: [] });
                    collector.stop(); // End the collector since we're done
                } catch (err) {
                    // This catches modal timeout or other errors
                    console.error(err);
                    const failEmbed = new EmbedBuilder()
                        .setTitle("❌ Failed to Add Emoji")
                        .setColor("Red")
                        .setDescription("Could not add the emoji. This is likely because:\n- The GIF is over 256KB.\n- The server is full of emojis.\n- The name is already taken.\n- You took too long to enter a name.");
                    // We use interaction.editReply here because the modal interaction might have timed out
                    await interaction.editReply({ embeds: [failEmbed], components: [makeButtons(true)] });
                }
            }
        });

        collector.on("end", (collected, reason) => {
            // Only edit if the interaction wasn't already updated by a success/fail message
            if (reason === "time") {
                interaction.editReply({ components: [makeButtons(true)] }).catch(() => {});
            }
        });
    }
};

// --- Helper: fetch GIFs (separated for clarity) ---
async function fetchGifs(term, limit = 20) {
    const url = `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(term)}&key=${TENOR_API}&client_key=${CLIENT_KEY}&limit=${limit}&media_filter=nanogif,tinygif,gif`;
    try {
        const res = await fetch(url);
        const data = await res.json();
        return data.results || [];
    } catch (err) {
        console.error("❌ Tenor fetch failed:", err);
        return [];
    }
}
