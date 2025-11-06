const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require("discord.js");
const QRCode = require("qrcode");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
    name: "qr",
    description: "Generate a QR code for any text or link",
    aliases: ["qrcode"],
    data: new SlashCommandBuilder()
        .setName("qr")
        .setDescription("Generate a QR code for any text or link")
        .addStringOption(option =>
            option.setName("text")
                .setDescription("Enter text or link to encode")
                .setRequired(true)
        ),

    async execute(message, args) {
        const input = args.join(" ");
        if (!input) return message.reply("❌ Please provide text or a link.");

        const filePath = path.join(__dirname, `${Date.now()}.png`);

        try {
            await QRCode.toFile(filePath, input, { width: 300, margin: 2 });
            const attachment = new AttachmentBuilder(filePath, { name: "qrcode.png" });

            const embed = new EmbedBuilder()
                .setColor("Blue")
                .setTitle("📱 QR Code Generated")
                .setDescription(`**Input:** ${input}`)
                .setImage("attachment://qrcode.png")
                .setFooter({ text: "𝘚𝘏𝘈𝘋𝘖𝘞 𝘉𝘖𝘛 - 𝘘𝘙 " });

            await message.reply({ embeds: [embed], files: [attachment] });
        } catch (err) {
            console.error("❌ QR generation failed:", err);
            await message.reply("⚠️ Failed to generate QR code.");
        } finally {
            setTimeout(() => fs.remove(filePath).catch(() => {}), 5000);
        }
    },

    async slashExecute(interaction) {
        const input = interaction.options.getString("text");
        const filePath = path.join(__dirname, `${Date.now()}.png`);

        try {
            await interaction.deferReply();

            await QRCode.toFile(filePath, input, { width: 300, margin: 2 });
            const attachment = new AttachmentBuilder(filePath, { name: "qrcode.png" });

            const embed = new EmbedBuilder()
                .setColor("Blue")
                .setTitle("📱 QR Code Generated")
                .setDescription(`**Input:** ${input}`)
                .setImage("attachment://qrcode.png")
                .setFooter({ text: "Generated locally (no API used)" });

            await interaction.editReply({ embeds: [embed], files: [attachment] });
        } catch (err) {
            console.error("❌ QR generation failed:", err);
            await interaction.editReply({ content: "⚠️ Failed to generate QR code." });
        } finally {
            setTimeout(() => fs.remove(filePath).catch(() => {}), 5000);
        }
    }
};
