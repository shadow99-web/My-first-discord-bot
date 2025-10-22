const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("roleinfo")
        .setDescription("Get detailed information about a role")
        .addRoleOption(option => option.setName("role").setDescription("Select a role")),

    async execute(context) {
        // Emojis (animated for consistency)
       
        const heart = "<a:blue_heart:1414309560231002194>";

        // Role selection
        const role = context.isPrefix
            ? (context.message.mentions.roles.first() || context.message.guild.roles.highest)
            : (context.interaction.options.getRole("role") || context.interaction.guild.roles.highest);

        // Member count safety
        const memberCount = role.members.size > 50 
            ? `${role.members.size} (showing 50)` 
            : `${role.members.size}`;

        // Embed
        const embed = new EmbedBuilder()
            .setTitle(`🎭 Role Info: ${role.name}`)
            .setColor(role.color || "Blue")
            .setTimestamp()
            .addFields(
                { name: "⚫ __Role ID__", value: `${heart} ${role.id}`, inline: true },
                { name: "💎 __Color__", value: `${heart} ${role.hexColor === "#000000" ? "Default" : role.hexColor}`, inline: true },
                { name: "🥂 __Members__", value: `${heart} ${memberCount}`, inline: true },
                { name: "♥ __Position__", value: `${heart} ${role.position}`, inline: true },
                { name: "🤞🏻 __Mentionable__", value: `${heart} ${role.mentionable ? "Yes" : "No"}`, inline: true },
                { name: "🤍 __Hoist in Sidebar__", value: `${heart} ${role.hoist ? "Yes" : "No"}`, inline: true },
                { name: "✏ __Created On__", value: `${heart} <t:${Math.floor(role.createdTimestamp / 1000)}:f>`, inline: false }
            );

        if (context.isPrefix) await context.message.reply({ embeds: [embed] });
        else await context.interaction.reply({ embeds: [embed] });
    }
};
