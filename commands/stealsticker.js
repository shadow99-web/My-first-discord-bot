const { SlashCommandBuilder, AttachmentBuilder, PermissionsBitField, EmbedBuilder } = require("discord.js");
const Canvas = require("@napi-rs/canvas");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("stealsticker")
        .setDescription("Steal a sticker or image and add it as a sticker to a server!")
        .addStringOption(option =>
            option
                .setName("serverid")
                .setDescription("The server ID where the sticker will be added")
                .setRequired(false)
        ),

    async execute(context) {
        const interaction = context.interaction;
        const message = context.message;
        const isPrefix = context.isPrefix;

        const user = isPrefix ? message.author : interaction.user;
        const repliedMsg = isPrefix ? message.reference && await message.fetchReference().catch(() => null)
            : interaction.options.getMessage("message") || null;

        const serverId = isPrefix
            ? message.content.split(" ")[1]
            : interaction.options.getString("serverid");

        const guild = serverId
            ? context.client.guilds.cache.get(serverId)
            : (isPrefix ? message.guild : interaction.guild);

        // 🔍 Check server permissions
        if (!guild) {
            return context.reply("⚠️ I couldn’t find that server. Make sure the bot is in it!");
        }
        if (!guild.members.me.permissions.has(PermissionsBitField.Flags.ManageEmojisAndStickers)) {
            return context.reply("❌ I don’t have permission to manage stickers in that server!");
        }

        // 🔍 Get image or sticker from reply
        const targetMsg = repliedMsg || message.reference && await message.fetchReference().catch(() => null);
        if (!targetMsg) return context.reply("⚠️ Please reply to a message containing an image or sticker!");

        let imageUrl = null;
        if (targetMsg.stickers.size > 0) {
            imageUrl = targetMsg.stickers.first().url;
        } else if (targetMsg.attachments.size > 0) {
            imageUrl = targetMsg.attachments.first().url;
        }

        if (!imageUrl) return context.reply("⚠️ No image or sticker found in the replied message!");

        // 🖼️ Load image
        const res = await fetch(imageUrl);
        const buffer = await res.arrayBuffer();
        const img = await Canvas.loadImage(Buffer.from(buffer));

        // 🖌️ Prepare sticker image
        const canvas = Canvas.createCanvas(img.width, img.height);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, img.width, img.height);

        const finalBuffer = canvas.toBuffer("image/png");
        const attachment = new AttachmentBuilder(finalBuffer, { name: "sticker.png" });

        // 🪄 Add sticker
        try {
            const sticker = await guild.stickers.create({
                file: attachment.attachment,
                name: `sticker_${Date.now()}`,
                tags: "fun, cool, custom"
            });

            const embed = new EmbedBuilder()
                .setTitle("✅ Sticker Added Successfully!")
                .setDescription(`Added to **${guild.name}** by ${user}`)
                .setImage(sticker.url)
                .setColor("Green");

            return context.reply({ embeds: [embed] });
        } catch (err) {
            console.error(err);
            return context.reply("❌ Failed to add sticker. Discord might have rejected the file format or size.");
        }
    }
};
