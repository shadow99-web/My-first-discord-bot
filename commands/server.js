const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("server")
        .setDescription("Get server information"),
    async execute(context) {
        const guild = context.isPrefix ? context.message.guild : context.interaction.guild;

        const embed = new EmbedBuilder()
            .setTitle(`🏰 ${guild.name} Info`)
            .addFields(
                { name: "Members", value: `${guild.memberCount}`, inline: true },
                { name: "Owner", value: `<@${guild.ownerId}>`, inline: true },
                { name: "Region", value: guild.preferredLocale, inline: true }
            )
            .setColor("Orange")
            .setTimestamp();

        if (context.isPrefix) await context.message.reply({ embeds: [embed] });
        else await context.interaction.reply({ embeds: [embed] });
    }
};
