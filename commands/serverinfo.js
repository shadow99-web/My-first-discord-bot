const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("serverinfo")
        .setDescription("Get detailed server information"),
    async execute(context) {
        const guild = context.isPrefix ? context.message.guild : context.interaction.guild;

        const roles = guild.roles.cache.map(r => r.name).join(", ") || "None";
        const embed = new EmbedBuilder()
            .setTitle(`🏰 ${guild.name} Info`)
            .setThumbnail(guild.iconURL({ dynamic: true }))
            .setImage(guild.bannerURL({ size: 1024 }) || null)
            .addFields(
                { name: "Owner", value: `<@${guild.ownerId}>`, inline: true },
                { name: "Members", value: `${guild.memberCount}`, inline: true },
                { name: "Boosts", value: `${guild.premiumSubscriptionCount}`, inline: true },
                { name: "Roles Count", value: `${guild.roles.cache.size}`, inline: true },
                { name: "Created On", value: `<t:${Math.floor(guild.createdTimestamp/1000)}:D>`, inline: true }
            )
            .setColor("Blue")
            .setTimestamp();

        if (context.isPrefix) await context.message.reply({ embeds: [embed] });
        else await context.interaction.reply({ embeds: [embed] });
    }
};
