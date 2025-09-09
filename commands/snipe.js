const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("snipe")
        .setDescription("Show the last 5 deleted messages from this channel"),

    async execute({ message, interaction, isPrefix, client }) {
        const blueHeart = "<a:blue_heart_1414309560231002194:1414309560231002194>";
        const channel = isPrefix ? message.channel : interaction.channel;

        // Ensure client.snipes exists
        if (!client.snipes) client.snipes = new Map();

        const snipes = client.snipes.get(channel.id) || [];

        if (snipes.length === 0) {
            const replyMsg = "❌ No recently deleted messages in this channel!";
            return isPrefix
                ? message.reply(replyMsg)
                : interaction.reply({ content: replyMsg, ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setTitle(`${blueHeart} Last ${snipes.length} Deleted Message(s)`)
            .setColor("Blue")
            .setTimestamp();

        snipes.forEach((s, i) => {
            // Use author info safely
            const authorName = s.author || "Unknown#0000";
            const authorAvatar = s.avatar || null;

            let value = `${s.content || "*No text content*"}\n🕒 <t:${Math.floor(s.createdAt / 1000)}:R>`;
            if (s.attachment) value += `\n[Attachment](${s.attachment})`;

            embed.addFields({
                name: `${blueHeart} #${i + 1} — ${authorName}`,
                value: value,
                inline: false
            });

            if (authorAvatar) embed.setThumbnail(authorAvatar); // show avatar of last deleted message
        });

        if (isPrefix) {
            await message.reply({ embeds: [embed] }).catch(() => {});
        } else {
            await interaction.reply({ embeds: [embed] }).catch(() => {});
        }
    }
};
