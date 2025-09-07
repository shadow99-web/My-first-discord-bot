const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("snipe")
        .setDescription("See the last deleted message in this channel"),
    async execute(context) {
        const channelId = context.isPrefix ? context.message.channel.id : context.interaction.channel.id;
        const sniped = context.isPrefix
            ? context.message.client.snipes.get(channelId)
            : context.interaction.client.snipes.get(channelId);

        if (!sniped) {
            const msg = "❌ No recently deleted messages in this channel.";
            if (context.isPrefix) return context.message.reply(msg);
            else return context.interaction.reply({ content: msg, ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setAuthor({ name: sniped.author })
            .setDescription(sniped.content)
            .setColor("Red")
            .setTimestamp(sniped.createdAt);

        if (context.isPrefix) await context.message.reply({ embeds: [embed] });
        else await context.interaction.reply({ embeds: [embed] });
    }
};
