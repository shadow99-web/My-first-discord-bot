const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("stickerid")
        .setDescription("Fetch sticker ID in copyable format")
        .addStringOption(opt =>
            opt.setName("sticker")
                .setDescription("Sticker ID or name")
                .setRequired(false)
        ),

    name: "stickerid",
    aliases: ["stid", "stinfo", "stickerinfo"],

    async execute(context) {
        const interaction = context.interaction;
        const message = context.message;

        // Input from prefix or slash
        const input = context.isPrefix
            ? context.args[0]
            : interaction.options.getString("sticker");

        let sticker = null;

        // ✅ If user replied to a message with a sticker
        if (context.isPrefix && message.reference) {
            const repliedMsg = await message.channel.messages.fetch(message.reference.messageId);
            if (repliedMsg?.stickers?.size > 0) {
                sticker = repliedMsg.stickers.first();
            }
        } else if (!context.isPrefix && interaction.options.getString("sticker") === null && interaction.repliedMessage) {
            const repliedMsg = await interaction.channel.messages.fetch(interaction.repliedMessage.id);
            if (repliedMsg?.stickers?.size > 0) {
                sticker = repliedMsg.stickers.first();
            }
        }

        // ✅ If input given (sticker ID or name)
        if (!sticker && input) {
            // Try ID first
            try {
                sticker = await context.client.fetchSticker(input).catch(() => null);
            } catch (e) {
                sticker = null;
            }

            // Try name in current guild
            if (!sticker && message?.guild) {
                const found = message.guild.stickers.cache.find(s => s.name.toLowerCase() === input.toLowerCase());
                if (found) sticker = found;
            }
        }

        // ❌ If still not found
        if (!sticker) {
            return context.isPrefix
                ? message.reply("❌ Could not find that sticker. Try replying to one or using its ID/name.")
                : interaction.reply("❌ Could not find that sticker. Try replying to one or using its ID/name.");
        }

        // ✅ Build sticker info
        const embed = new EmbedBuilder()
            .setTitle("🌐 Sticker Information")
            .setColor("Purple")
            .addFields(
                { name: " Name", value: sticker.name, inline: true },
                { name: " ID", value: sticker.id, inline: true },
                { name: " Format", value: sticker.format.toString(), inline: true },
                { name: " Copyable ID", value: `\`${sticker.id}\``, inline: false }
            )
            .setImage(sticker.url);

        return context.isPrefix
            ? message.reply({ embeds: [embed] })
            : interaction.reply({ embeds: [embed] });
    }
};
