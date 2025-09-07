const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Check bot latency!"),
    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setTitle("🏓 Pong!")
            .setDescription(`Latency is ${Date.now() - interaction.createdTimestamp}ms`)
            .setColor("Green")
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
