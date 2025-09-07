const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("userinfo")
        .setDescription("Get detailed information about a user")
        .addUserOption(option => option.setName("target").setDescription("Select a user")),

    async execute(context) {
        // Animated Emojis
        const arrow = "<a:flecha:1414301944868245574>";
        const blueHeart = "<a:blue_heart:1414309560231002194>";

        // User selection
        const user = context.isPrefix
            ? (context.message.mentions.users.first() || context.message.author)
            : (context.interaction.options.getUser("target") || context.interaction.user);

        const guild = context.isPrefix ? context.message.guild : context.interaction.guild;
        const member = guild.members.cache.get(user.id);

        // Roles formatting (limit long lists)
        let roles = "N/A";
        if (member) {
            const roleList = member.roles.cache
                .filter(r => r.id !== guild.id)
                .map(r => r.toString());
            roles = roleList.length > 0 ? roleList.slice(0, 15).join(", ") : "None";
            if (roleList.length > 15) roles += `, and ${roleList.length - 15} more...`;
        }

        // Embed
        const embed = new EmbedBuilder()
            .setTitle(`👤 User Info: ${user.tag}`)
            .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 1024 }))
            .setColor("Blue")
            .setTimestamp()
            .addFields(
                { name: "🆔 __ID__", value: `${arrow} ${user.id}`, inline: true },
                { name: "❤ __Username__", value: `${blueHeart} ${user.username}`, inline: true },
                { name: "🔢 __Discriminator__", value: `${arrow} #${user.discriminator}`, inline: true },
                { name: "🤖 __Bot__", value: `${blueHeart} ${user.bot ? "Yes" : "No"}`, inline: true },
                { name: "📅 __Account Created__", value: `${arrow} <t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
                { name: "📥 __Joined Server__", value: `${blueHeart} ${member ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : "N/A"}`, inline: true },
                { name: "🎭 __Roles__", value: `${arrow} ${roles}`, inline: false },
                { name: "💫 __Highest Role__", value: `${blueHeart} ${member ? member.roles.highest.toString() : "N/A"}`, inline: true },
                { name: "♨️ __Nickname__", value: `${arrow} ${member ? member.displayName : "N/A"}`, inline: true }
            );

        if (context.isPrefix) await context.message.reply({ embeds: [embed] });
        else await context.interaction.reply({ embeds: [embed] });
    }
};
