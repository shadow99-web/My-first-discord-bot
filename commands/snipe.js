const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("snipe")
        .setDescription("Show the last 5 deleted messages from this channel"),

    async execute({ message, interaction, isPrefix, client }) {
        const blueHeart = "<a:blue_heart:1414309560231002194>";
        const channel = isPrefix ? message.channel : interaction.channel;

        // Ensure client.snipes exists
        if (!client.snipes) client.snipes = new Map();

        const snipes = client.snipes.get(channel.id) || [];

        if (snipes.length === 0) {
            const replyMsg = "❌ No recently deleted messages in this channel!";
            if (isPrefix) return message.reply(replyMsg);
            else return interaction.reply({ content: replyMsg, ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setTitle(`${blueHeart} Last ${snipes.length} Deleted Message(s)`)
            .setColor("Blue")
            .setTimestamp();

        // Add each snipe to the embed
        snipes.forEach((s, i) => {
            let value = `${s.content || "*No text content*"}\n🕒 <t:${Math.floor(s.createdAt / 1000)}:R>`;
            if (s.attachment) value += `\n[Attachment](${s.attachment})`;

            embed.addFields({
                name: `${blueHeart} #${i + 1} — ${s.author}`,
                value: value,
                inline: false
            });
        });

        if (isPrefix) message.reply({ embeds: [embed] });
        else interaction.reply({ embeds: [embed] });
    }
};
