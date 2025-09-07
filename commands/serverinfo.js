const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("serverinfo")
        .setDescription("Get detailed server information"),
    async execute(context) {
        const guild = context.isPrefix ? context.message.guild : context.interaction.guild;

        const embed = new EmbedBuilder()
            .setTitle(`🏰 ${guild.name} Info`)
            .addFields(
                { name: "Owner", value: `<@${guild.ownerId}>`, inline: true },
                { name: "Members", value: `${guild.memberCount}`, inline: true },
                { name: "Boosts", value: `${guild.premiumSubscriptionCount}`, inline: true },
                { name: "Roles", value: `${guild.roles.cache.size}`, inline: true },
                { name: "Created On", value: `<t:${Math.floor(guild.createdTimestamp/1000)}:D>`, inline: true }
            )
            .setColor("Blue")
            .setThumbnail(guild.iconURL({ dynamic: true }))
            .setTimestamp();

        if (context.isPrefix) await context.message.reply({ embeds: [embed] });
        else await context.interaction.reply({ embeds: [embed] });
    }
};
