const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const axios = require("axios");
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("stealsticker")
        .setDescription("Steal and add a sticker from any image, GIF, or URL to a specific server")
        .addStringOption(opt =>
            opt.setName("url")
                .setDescription("Sticker / image / gif URL (optional if replying)")
                .setRequired(false)
        )
        .addStringOption(opt =>
            opt.setName("name")
                .setDescription("Sticker name (optional)")
                .setRequired(false)
        )
        .addStringOption(opt =>
            opt.setName("serverid")
                .setDescription("Target server ID where to add the sticker")
                .setRequired(false)
        ),

    name: "stealsticker",
    aliases: ["sticksteal", "addsticker"],

    async execute(context) {
        const interaction = context.interaction;
        const message = context.message;
        const client = context.client;
        const user = context.isPrefix ? message.author : interaction.user;

        const inputUrl = context.isPrefix
            ? message.content.split(" ")[1]
            : interaction.options.getString("url");
        const inputName = context.isPrefix
            ? message.content.split(" ")[2]
            : interaction.options.getString("name");
        const inputServerId = context.isPrefix
            ? message.content.split(" ")[3]
            : interaction.options.getString("serverid");

        // 🧠 Determine target guild
        const targetGuild = inputServerId
            ? client.guilds.cache.get(inputServerId)
            : (context.isPrefix ? message.guild : interaction.guild);

        if (!targetGuild) {
            const msg = "❌ Invalid or missing server ID. I must be in that server to add the sticker.";
            return context.isPrefix
                ? message.reply(msg)
                : interaction.reply(msg);
        }

        if (!targetGuild.members.me.permissions.has("MANAGE_EMOJIS_AND_STICKERS")) {
            const msg = `❌ I need \`Manage Emojis and Stickers\` permission in **${targetGuild.name}**.`;
            return context.isPrefix
                ? message.reply(msg)
                : interaction.reply(msg);
        }

        // 🖼️ Get URL or replied attachment
        let url = inputUrl;
        if (!url && context.isPrefix && message.reference) {
            const refMsg = await message.fetchReference();
            url = refMsg.attachments.first()?.url;
        }
        if (!url && interaction?.options && !inputUrl && message?.attachments?.first()) {
            url = message.attachments.first().url;
        }

        if (!url) {
            const msg = "⚠️ Please provide a URL or reply to a message with an image, GIF, or sticker.";
            return context.isPrefix
                ? message.reply(msg)
                : interaction.reply(msg);
        }

        const fileExt = path.extname(url).toLowerCase();
        const validFormats = [".png", ".jpg", ".jpeg", ".webp", ".gif"];
        if (!validFormats.includes(fileExt)) {
            const msg = "❌ Invalid file type. Supported: PNG, JPG, WEBP, or GIF.";
            return context.isPrefix
                ? message.reply(msg)
                : interaction.reply(msg);
        }

        // 🧠 Auto-generate name
        let name = inputName;
        if (!name) {
            name =
                path.basename(url, fileExt)
                    .replace(/[^a-zA-Z0-9_]/g, "")
                    .substring(0, 30) ||
                `sticker_${Date.now()}`;
        }

        const tempFile = `./temp_${Date.now()}${fileExt}`;
        const finalFile = `./final_${Date.now()}.webp`;

        try {
            // 📥 Download file
            const response = await axios.get(url, { responseType: "arraybuffer" });
            fs.writeFileSync(tempFile, response.data);

            // 🧩 Resize + convert using sharp
            await sharp(tempFile)
                .resize(320, 320, { fit: "inside" })
                .toFormat("webp")
                .toFile(finalFile);

            // 🚀 Upload sticker to target server
            const sticker = await targetGuild.stickers.create({
                file: finalFile,
                name: name,
                tags: "stolen sticker",
                description: `Stolen by ${user.username}`
            });

            fs.unlinkSync(tempFile);
            fs.unlinkSync(finalFile);

            const embed = new EmbedBuilder()
                .setColor("Blue")
                .setTitle("🌀 Sticker Stolen Successfully!")
                .setDescription(
                    `**Name:** ${sticker.name}\n**Server:** ${targetGuild.name}\n**Added by:** ${user}`
                )
                .setImage(url)
                .setFooter({ text: "Sticker successfully uploaded!" })
                .setTimestamp();

            return context.isPrefix
                ? message.reply({ embeds: [embed] })
                : interaction.reply({ embeds: [embed] });

        } catch (err) {
            console.error("Sticker Steal Error:", err);
            const msg = "❌ Failed to steal or add sticker. File might be too large or server has sticker slot limits.";
            return context.isPrefix
                ? message.reply(msg)
                : interaction.reply(msg);
        }
    }
};
