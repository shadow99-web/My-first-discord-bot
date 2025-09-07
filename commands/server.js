const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("server")
        .setDescription("Get server information"),
    async execute(interaction) {
        const { guild } = interaction;

        const embed = new EmbedBuilder()
            .setTitle(`🏰 ${guild.name}`)
            .setThumbnail(guild.iconURL({ dynamic: true }))
            .addFields(
                { name: "Server ID", value: guild.id, inline: true },
                { name: "Members", value: `${guild.memberCount}`, inline: true },
                { name: "Created On", value: `${guild.createdAt.toDateString()}`, inline: true },
                { name: "Owner", value: `<@${guild.ownerId}>`, inline: true }
            )
            .setColor("Purple")
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
