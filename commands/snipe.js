const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("snipe")
        .setDescription("Show the last 5 deleted messages from this channel"),

    async execute({ message, interaction, isPrefix, client }) {
        const heart = "<a:blue_heart:1414309560231002194>";
        const channel = isPrefix ? message.channel : interaction.channel;
        const snipes = client.snipes.get(channel.id) || [];

        if (snipes.length === 0) {
            const replyMsg = "❌ No recently deleted messages in this channel!";
            if (isPrefix) return message.reply(replyMsg);
            else return interaction.reply({ content: replyMsg, ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setTitle(`${heart} Last ${snipes.length} Deleted Message(s)`)
            .setColor("Blue")
            .setTimestamp();

        snipes.forEach((s, i) => {
            embed.addFields({
                name: `${heart} #${i + 1} — ${s.author}`,
                value: `${s.content || "*No content*"}\n🕒 <t:${Math.floor(s.createdAt / 1000)}:R>`,
                inline: false
            });
        });

        // If the last deleted message had an attachment, show it
        const lastAttachment = snipes[0].attachment;
        if (lastAttachment) embed.setImage(lastAttachment);

        if (isPrefix) message.reply({ embeds: [embed] });
        else interaction.reply({ embeds: [embed] });
    }
};
