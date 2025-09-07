const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Check bot latency"),
    async execute(context) {
        let latency = context.isPrefix
            ? Date.now() - context.message.createdTimestamp
            : Date.now() - context.interaction.createdTimestamp;

        const embed = new EmbedBuilder()
            .setTitle("🏓 Pong!")
            .setDescription(`Latency is ${latency}ms`)
            .setColor("Green")
            .setTimestamp();

        if (context.isPrefix) {
            await context.message.reply({ embeds: [embed] });
        } else {
            await context.interaction.reply({ embeds: [embed] });
        }
    }
};
