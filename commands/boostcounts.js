const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("boostcount")
        .setDescription("Show total server boosts"),
    async execute(context) {
        const guild = context.isPrefix ? context.message.guild : context.interaction.guild;
        const embed = new EmbedBuilder()
            .setTitle(`🚀 ${guild.name} Boosts`)
            .setDescription(`Total Boosts: **${guild.premiumSubscriptionCount}**`)
            .setColor("Yellow")
            .setTimestamp();

        if (context.isPrefix) await context.message.reply({ embeds: [embed] });
        else await context.interaction.reply({ embeds: [embed] });
    }
};
