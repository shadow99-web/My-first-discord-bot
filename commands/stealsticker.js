const { SlashCommandBuilder, AttachmentBuilder, PermissionsBitField, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require("discord.js");
const Canvas = require("@napi-rs/canvas");
const fetch = require("node-fetch");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("stealsticker")
        .setDescription("Steal a sticker or image and add it as a sticker to a server!")
        .addStringOption(option =>
            option
                .setName("serverid")
                .setDescription("The server ID where the sticker will be added")
                .setRequired(false)
        )
        .addStringOption(option =>
            option
                .setName("messageid")
                .setDescription("The ID of the message containing the sticker or image")
                .setRequired(false)
        ),

    async execute(context) {
        const { interaction, message, isPrefix, client } = context;
        const user = isPrefix ? message.author : interaction.user;

        // Helper for replying safely
        const sendReply = async (msg) => {
            if (isPrefix) return message.reply(msg);
            else return interaction.reply({ ...msg, ephemeral: true }).catch(() => {});
        };

        // Get guild
        const serverId = isPrefix
            ? message.content.split(" ")[1] // optional
            : interaction.options.getString("serverid");
        const guild = serverId
            ? client.guilds.cache.get(serverId)
            : (isPrefix ? message.guild : interaction.guild);

        if (!guild) return sendReply({ content: "⚠️ I couldn’t find that server. Make sure the bot is in it!" });
        if (!guild.members.me.permissions.has(PermissionsBitField.Flags.ManageEmojisAndStickers))
            return sendReply({ content: "❌ I don’t have permission to manage stickers in that server!" });

        // Get target message
        let targetMsg;
        if (isPrefix) {
            targetMsg = message.reference ? await message.fetchReference().catch(() => null) : null;
        } else {
            const messageId = interaction.options.getString("messageid");
            if (messageId) {
                try {
                    targetMsg = await interaction.channel.messages.fetch(messageId);
                } catch { targetMsg = null; }
            }
        }

        if (!targetMsg) {
            // If slash command without message ID, show modal to ask user for it
            if (!isPrefix) {
                const modal = new ModalBuilder()
                    .setCustomId("sticker_modal")
                    .setTitle("Provide Message ID");

                const input = new TextInputBuilder()
                    .setCustomId("msg_id")
                    .setLabel("Message ID containing the sticker or image")
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                modal.addComponents(new ActionRowBuilder().addComponents(input));

                await interaction.showModal(modal);

                try {
                    const submitted = await interaction.awaitModalSubmit({
                        filter: i => i.user.id === user.id && i.customId === "sticker_modal",
                        time: 60000
                    });

                    const msgId = submitted.fields.getTextInputValue("msg_id");
                    try { targetMsg = await interaction.channel.messages.fetch(msgId); }
                    catch { return submitted.update({ content: "⚠️ Could not fetch that message ID.", components: [], embeds: [] }); }
                    await submitted.update({ content: "✅ Message fetched, processing sticker...", components: [], embeds: [] });
                } catch {
                    return; // Modal timed out
                }
            } else {
                return sendReply({ content: "⚠️ Please reply to a message containing an image or sticker!" });
            }
        }

        // Extract image or sticker URL
        let imageUrl = null;
        if (targetMsg.stickers.size > 0) imageUrl = targetMsg.stickers.first().url;
        else if (targetMsg.attachments.size > 0) imageUrl = targetMsg.attachments.first().url;

        if (!imageUrl) return sendReply({ content: "⚠️ No image or sticker found in the target message!" });

        try {
            // Load image
            const res = await fetch(imageUrl);
            const buffer = await res.arrayBuffer();
            const img = await Canvas.loadImage(Buffer.from(buffer));

            const canvas = Canvas.createCanvas(img.width, img.height);
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, img.width, img.height);

            const finalBuffer = canvas.toBuffer("image/png");
            const attachment = new AttachmentBuilder(finalBuffer, { name: "sticker.png" });

            const sticker = await guild.stickers.create({
                file: attachment.attachment,
                name: `sticker_${Date.now()}`,
                tags: "fun, custom"
            });

            const embed = new EmbedBuilder()
                .setTitle("✅ Sticker Added Successfully!")
                .setDescription(`Added to **${guild.name}** by ${user}`)
                .setImage(sticker.url)
                .setColor("Green");

            return sendReply({ embeds: [embed] });
        } catch (err) {
            console.error(err);
            return sendReply({ content: "❌ Failed to add sticker. Discord might have rejected the file format or size." });
        }
    }
};
