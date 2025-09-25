const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("snipe")
        .setDescription("Show the last 5 deleted messages from this channel"),

    async execute({ message, interaction, isPrefix, client }) {
        const blueHeart = "<a:blue_heart:1414309560231002194>"; // fixed your emoji format
        const channel = isPrefix ? message.channel : interaction.channel;

        // Ensure snipes exist
        if (!client.snipes) client.snipes = new Map();
        const snipes = client.snipes.get(channel.id) || [];

        if (snipes.length === 0) {
            const replyMsg = "❌ No recently deleted messages in this channel!";
            return isPrefix
                ? message.reply(replyMsg).catch(() => {})
                : interaction.reply({ content: replyMsg, ephemeral: true }).catch(() => {});
        }

        const embed = new EmbedBuilder()
            .setTitle(`${blueHeart} Last ${snipes.length} Deleted Message(s)`)
            .setColor("Blue")
            .setTimestamp();

        snipes.forEach((s, i) => {
            const authorName = s.author || "Unknown#0000";
            let value = `${s.content || "*No text content*"}\n🕒 <t:${Math.floor(s.createdAt / 1000)}:R>`;
            
            if (s.attachment) value += `\n➕ [Attachment](${s.attachment})`;
            if (s.deletedBy) value += `\n 🤞🏻Deleted by **${s.deletedBy}**`;

            embed.addFields({
                name: `${blueHeart} #${i + 1} — ${authorName}`,
                value,
                inline: false,
            });
        });

        // Thumbnail: only show the first (most recent) snipe’s avatar if available
        if (snipes[0]?.avatar) {
            embed.setThumbnail(snipes[0].avatar);
        }

        if (isPrefix) {
            await message.reply({ embeds: [embed] }).catch(() => {});
        } else {
            await interaction.reply({ embeds: [embed] }).catch(() => {});
        }
    }
};
