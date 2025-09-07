const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("userinfo")
        .setDescription("Get detailed information about a user")
        .addUserOption(option => option.setName("target").setDescription("Select a user")),

    async execute(context) {
        const user = context.isPrefix 
            ? (context.message.mentions.users.first() || context.message.author) 
            : (context.interaction.options.getUser("target") || context.interaction.user);
        const member = context.isPrefix 
            ? context.message.guild.members.cache.get(user.id) 
            : context.interaction.guild.members.cache.get(user.id);

        const embed = new EmbedBuilder()
            .setTitle(`👤 User Info: ${user.tag}`)
            .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 1024 }))
            .addFields(
                { name: "ID", value: user.id, inline: true },
                { name: "Username", value: user.username, inline: true },
                { name: "Discriminator", value: `#${user.discriminator}`, inline: true },
                { name: "Bot", value: user.bot ? "Yes 🤖" : "No", inline: true },
                { name: "Account Created", value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
                { name: "Joined Server", value: member ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : "N/A", inline: true },
                { name: "Roles", value: member ? member.roles.cache.filter(r => r.id !== context.isPrefix ? context.message.guild.id : context.interaction.guild.id).map(r => r).join(", ") || "None" : "N/A" },
                { name: "Highest Role", value: member ? member.roles.highest.name : "N/A", inline: true },
                { name: "Nickname", value: member ? member.displayName : "N/A", inline: true }
            )
            .setColor("Blue")
            .setFooter({ text: `Requested by ${context.isPrefix ? context.message.author.tag : context.interaction.user.tag}` })
            .setTimestamp();

        if (context.isPrefix) await context.message.reply({ embeds: [embed] });
        else await context.interaction.reply({ embeds: [embed] });
    }
};
