const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require("discord.js");
const Canvas = require("@napi-rs/canvas");
const fetch = require("node-fetch");
const sharp = require("sharp");
const gifFrames = require("gif-frames");
const fs = require("fs");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("stealsticker")
        .setDescription("Steal an image, sticker, GIF, or WebP and add it as a server sticker!")
        .addStringOption(opt =>
            opt.setName("serverid")
                .setDescription("Server ID where sticker will be added")
                .setRequired(false)
        ),

    async execute(context) {
        const interaction = context.interaction;
        const message = context.message;
        const isPrefix = context.isPrefix;
        const user = isPrefix ? message.author : interaction.user;

        const repliedMsg = isPrefix
            ? message.reference && await message.fetchReference().catch(() => null)
            : interaction.options.getMessage("message") || null;

        const serverId = isPrefix
            ? message.content.split(" ")[1]
            : interaction.options.getString("serverid");

        const guild = serverId
            ? context.client.guilds.cache.get(serverId)
            : (isPrefix ? message.guild : interaction.guild);

        // Permission checks
        if (!guild) return context.reply("⚠️ Couldn’t find that server!");
        if (!guild.members.me.permissions.has(PermissionsBitField.Flags.ManageEmojisAndStickers))
            return context.reply("❌ I don’t have `Manage Emojis and Stickers` permission!");

        // Find sticker/image/gif
        const targetMsg = repliedMsg || (message.reference && await message.fetchReference().catch(() => null));
        if (!targetMsg) return context.reply("⚠️ Reply to a message containing an image, GIF, or sticker!");

        let imageUrl = null;
        if (targetMsg.stickers.size > 0) {
            imageUrl = targetMsg.stickers.first().url;
        } else if (targetMsg.attachments.size > 0) {
            imageUrl = targetMsg.attachments.first().url;
        }
        if (!imageUrl) return context.reply("⚠️ No image, GIF, or sticker found!");

        try {
            const res = await fetch(imageUrl);
            const buffer = Buffer.from(await res.arrayBuffer());
            let outputBuffer = buffer;

            // 🌀 Handle GIF (extract first frame)
            if (imageUrl.endsWith(".gif")) {
                try {
                    const frames = await gifFrames({ url: imageUrl, frames: 0, outputType: "png" });
                    const framePath = `/tmp/frame_${Date.now()}.png`;
                    await new Promise(resolve => {
                        const stream = frames[0].getImage().pipe(fs.createWriteStream(framePath));
                        stream.on("finish", resolve);
                    });
                    outputBuffer = fs.readFileSync(framePath);
                    fs.unlinkSync(framePath);
                } catch (e) {
                    console.warn("⚠️ GIF extraction failed, using original image:", e.message);
                }
            }

            // 🧩 Convert WebP → PNG (and all others to PNG)
            outputBuffer = await sharp(outputBuffer)
                .resize({ width: 320, height: 320, fit: "inside" })
                .png({ quality: 90, compressionLevel: 9 })
                .toBuffer();

            // 🪄 Compress to <512 KB
            if (outputBuffer.length > 512 * 1024) {
                outputBuffer = await sharp(outputBuffer)
                    .resize({ width: 256, height: 256, fit: "inside" })
                    .png({ quality: 85, compressionLevel: 9 })
                    .toBuffer();
            }

            if (outputBuffer.length > 512 * 1024)
                return context.reply("⚠️ Couldn’t compress below 512 KB. Try smaller image!");

            // ✅ Add sticker
            const sticker = await guild.stickers.create({
                file: outputBuffer,
                name: `sticker_${Date.now()}`,
                tags: "fun, meme, custom"
            });

            const embed = new EmbedBuilder()
                .setTitle("✅ Sticker Added Successfully!")
                .setDescription(`Added to **${guild.name}** by ${user}`)
                .setImage(sticker.url)
                .setColor("Green");

            return context.reply({ embeds: [embed] });
        } catch (err) {
            console.error("❌ Sticker creation error:", err);
            return context.reply("❌ Failed to add sticker. File may be corrupted or unsupported.");
        }
    }
};
