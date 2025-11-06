const { SlashCommandBuilder, AttachmentBuilder } = require("discord.js");
const QRCode = require("qrcode");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("qr")
        .setDescription("Generate a QR code from text or URL.")
        .addStringOption(option =>
            option.setName("text")
                .setDescription("Enter the text or URL to generate QR code for")
                .setRequired(true)
        ),
    name: "qr",
    description: "Generate a QR code from text or URL",
    
    async execute(context) {
        try {
            const text = context.isPrefix
                ? context.args.join(" ")
                : context.interaction.options.getString("text");

            if (!text) {
                const msg = "❌ Please provide text or a URL to generate a QR code.";
                return context.isPrefix
                    ? context.message.reply(msg)
                    : context.interaction.reply({ content: msg, flags: 64 });
            }

            // Generate QR code as image buffer
            const buffer = await QRCode.toBuffer(text, {
                color: {
                    dark: "#000000",
                    light: "#FFFFFF"
                },
                width: 512
            });

            const attachment = new AttachmentBuilder(buffer, { name: "qr.png" });

            if (context.isPrefix) {
                await context.message.reply({ content: "✅ Here's your QR code:", files: [attachment] });
            } else {
                await context.interaction.reply({ content: "✅ Here's your QR code:", files: [attachment] });
            }

        } catch (err) {
            console.error("❌ Error in command qr:", err);
            const msg = "⚠️ Failed to generate QR code. Please try again later.";
            if (context.isPrefix)
                await context.message.reply(msg);
            else
                await context.interaction.reply({ content: msg, flags: 64 });
        }
    }
};
