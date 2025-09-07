const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("userinfo")
        .setDescription("Get detailed information about a user")
        .addUserOption(option => option.setName("target").setDescription("Select a user")),

    async execute(context) {
        const arrow = ":flecha_1414301944868245574:";
        const user = context.isPrefix 
            ? (context.message.mentions.users.first() || context.message.author) 
            : (context.interaction.options.getUser("target") || context.interaction.user);
        const member = context.isPrefix 
            ? context.message.guild.members.cache.get(user.id) 
            : context.interaction.guild.members.cache.get(user.id);

        const embed = new EmbedBuilder()
            .setTitle(`👤 User Info: ${user.tag}`)
            .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 1024 }))
            .setColor("Blue")
            .setTimestamp()
            .addFields(
                { name: '🆔 __ID__', value: `${arrow} ${user.id}`, inline: true },
                { name: '💻 __Username__', value: `${arrow} ${user.username}`, inline: true },
                { name: '🔢 __Discriminator__', value: `${arrow} #${user.discriminator}`, inline: true },
                { name: '🤖 __Bot__', value: `${arrow} ${user.bot ? "Yes" : "No"}`, inline: true },
                { name: '📅 __Account Created__', value: `${arrow} <t:${Math.floor(user.createdTimestamp/1000)}:R>`, inline: true },
                { name: '📥 __Joined Server__', value: `${arrow} ${member ? `<t:${Math.floor(member.joinedTimestamp/1000)}:R>` : "N/A"}`, inline: true },
                { name: '🎭 __Roles__', value: `${arrow} ${member ? member.roles.cache.filter(r => r.id !== context.isPrefix ? context.message.guild.id : context.interaction.guild.id).map(r => r).join(", ") || "None" : "N/A"}`, inline: false },
                { name: '🏅 __Highest Role__', value: `${arrow} ${member ? member.roles.highest.name : "N/A"}`, inline: true },
                { name: '📝 __Nickname__', value: `${arrow} ${member ? member.displayName : "N/A"}`, inline: true }
            );

        if (context.isPrefix) await context.message.reply({ embeds: [embed] });
        else await context.interaction.reply({ embeds: [embed] });
    }
};
