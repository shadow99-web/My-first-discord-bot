const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("roleinfo")
        .setDescription("Get information about a role")
        .addRoleOption(option => option.setName("role").setDescription("Select a role")),

    async execute(context) {
        const arrow = ":flecha_1414301944868245574:";
        const role = context.isPrefix 
            ? context.message.mentions.roles.first() || context.message.guild.roles.highest
            : context.interaction.options.getRole("role") || context.interaction.guild.roles.highest;

        const embed = new EmbedBuilder()
            .setTitle(`🎭 Role Info: ${role.name}`)
            .setColor(role.color || "Blue")
            .setTimestamp()
            .addFields(
                { name: '🆔 __Role ID__', value: `${arrow} ${role.id}`, inline: true },
                { name: '💎 __Color__', value: `${arrow} ${role.hexColor}`, inline: true },
                { name: '👥 __Members__', value: `${arrow} ${role.members.size}`, inline: true },
                { name: '🔝 __Position__', value: `${arrow} ${role.position}`, inline: true },
                { name: '📝 __Mentionable__', value: `${arrow} ${role.mentionable ? "Yes" : "No"}`, inline: true },
                { name: '📌 __Hoist in Sidebar__', value: `${arrow} ${role.hoist ? "Yes" : "No"}`, inline: true }
            );

        if (context.isPrefix) await context.message.reply({ embeds: [embed] });
        else await context.interaction.reply({ embeds: [embed] });
    }
};
