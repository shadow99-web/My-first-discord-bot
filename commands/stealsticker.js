const { SlashCommandBuilder, AttachmentBuilder, PermissionsBitField, EmbedBuilder, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require("discord.js");
const Canvas = require("@napi-rs/canvas");
const fetch = require("node-fetch");
const GIFEncoder = require("gif-encoder-2"); // For animated GIF detection & frame handling
const fs = require("fs");
const { execSync } = require("child_process"); // We can use ffmpeg for GIF → APNG if needed

const MAX_SIZE = 512 * 1024; // 512 KB
const MAX_DIM = 512; // 512px

module.exports = {
    data: new SlashCommandBuilder()
        .setName("stealsticker")
        .setDescription("Steal a sticker, image, or animated GIF and add it as a sticker!")
        .addStringOption(option =>
            option.setName("serverid")
                .setDescription("Server ID to add sticker")
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName("messageid")
                .setDescription("Message ID containing image or sticker")
                .setRequired(false)
        ),

    async execute(context) {
        const { interaction, message, isPrefix, client } = context;
        const user = isPrefix ? message.author : interaction.user;

        const sendReply = async (msg) => {
            if (isPrefix) return message.reply(msg);
            else return interaction.reply({ ...msg, ephemeral: true }).catch(() => {});
        };

        const serverId = isPrefix
            ? message.content.split(" ")[1]
            : interaction.options.getString("serverid");

        const guild = serverId
            ? client.guilds.cache.get(serverId)
            : (isPrefix ? message.guild : interaction.guild);

        if (!guild) return sendReply({ content: "⚠️ I couldn’t find that server!" });
        if (!guild.members.me.permissions.has(PermissionsBitField.Flags.ManageEmojisAndStickers))
            return sendReply({ content: "❌ I don’t have permission to manage stickers!" });

        let targetMsg;
        if (isPrefix) targetMsg = message.reference ? await message.fetchReference().catch(() => null) : null;
        else {
            const messageId = interaction.options.getString("messageid");
            if (messageId) {
                try { targetMsg = await interaction.channel.messages.fetch(messageId); }
                catch { targetMsg = null; }
            }
        }

        if (!targetMsg) return sendReply({ content: "⚠️ Please reply to a message containing an image, GIF, or sticker!" });

        let imageUrl = null;
        if (targetMsg.stickers.size > 0) imageUrl = targetMsg.stickers.first().url;
        else if (targetMsg.attachments.size > 0) imageUrl = targetMsg.attachments.first().url;
        if (!imageUrl) return sendReply({ content: "⚠️ No image or sticker found!" });

        try {
            const res = await fetch(imageUrl);
            const buffer = await res.arrayBuffer();
            const imgBuffer = Buffer.from(buffer);

            // Detect GIF
            const isGif = imageUrl.endsWith(".gif") || imgBuffer[0] === 0x47 && imgBuffer[1] === 0x49 && imgBuffer[2] === 0x46;

            let finalBuffer;

            if (isGif) {
                // Use ffmpeg to convert GIF → APNG
                const inputPath = `./temp_${Date.now()}.gif`;
                const outputPath = `./temp_${Date.now()}.png`;

                fs.writeFileSync(inputPath, imgBuffer);

                try {
                    execSync(`ffmpeg -y -i ${inputPath} -plays 0 -vf "scale='min(${MAX_DIM},iw)':'min(${MAX_DIM},ih)':force_original_aspect_ratio=decrease" ${outputPath}`);
                    finalBuffer = fs.readFileSync(outputPath);

                    // Cleanup temp files
                    fs.unlinkSync(inputPath);
                    fs.unlinkSync(outputPath);
                } catch (err) {
                    console.error("GIF → APNG conversion failed, fallback to static PNG", err);
                    // fallback: first frame only
                    const img = await Canvas.loadImage(imgBuffer);
                    const scale = Math.min(MAX_DIM / img.width, MAX_DIM / img.height, 1);
                    const canvas = Canvas.createCanvas(img.width * scale, img.height * scale);
                    const ctx = canvas.getContext("2d");
                    ctx.drawImage(img, 0, 0, img.width * scale, img.height * scale);
                    finalBuffer = canvas.toBuffer("image/png");
                }
            } else {
                // static image
                const img = await Canvas.loadImage(imgBuffer);
                const scale = Math.min(MAX_DIM / img.width, MAX_DIM / img.height, 1);
                const canvas = Canvas.createCanvas(img.width * scale, img.height * scale);
                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0, img.width * scale, img.height * scale);
                finalBuffer = canvas.toBuffer("image/png");
            }

            // Compress if > 512 KB
            let quality = 0.9;
            while (finalBuffer.length > MAX_SIZE && quality > 0.1) {
                finalBuffer = Canvas.createCanvas(MAX_DIM, MAX_DIM).toBuffer("image/png", { quality });
                quality -= 0.1;
            }

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
            return sendReply({ content: "❌ Failed to add sticker. File might be too large or unsupported." });
        }
    }
};
