const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("roleinfo")
        .setDescription("Get information about a role")
        .addRoleOption(option => option.setName("role").setDescription("Select a role").setRequired(true)),
    async execute(context) {
        const role = context.isPrefix ? context.message.mentions.roles.first() : context.interaction.options.getRole("role");
        if (!role) {
            const msg = "❌ Please mention a role!";
            if (context.isPrefix) return context.message.reply(msg);
            else return context.interaction.reply({ content: msg, ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setTitle(`🔹 Role Info: ${role.name}`)
            .addFields(
                { name: "ID", value: role.id, inline: true },
                { name: "Color", value: role.hexColor, inline: true },
                { name: "Members", value: `${role.members.size}`, inline: true },
                { name: "Mentionable", value: role.mentionable ? "Yes" : "No", inline: true },
                { name: "Position", value: `${role.position}`, inline: true }
            )
            .setColor(role.hexColor || "Blue")
            .setTimestamp();

        if (context.isPrefix) await context.message.reply({ embeds: [embed] });
        else await context.interaction.reply({ embeds: [embed] });
    }
};
