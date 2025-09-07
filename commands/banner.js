const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("banner")
        .setDescription("Get the banner of a user")
        .addUserOption(option =>
            option.setName("target")
                .setDescription("Select a user")
        ),
    async execute({ message, args, interaction, isPrefix }) {
        const arrow = ":flecha_1414301944868245574:";
        const user = isPrefix
            ? (message.mentions.users.first() || message.author)
            : (interaction.options.getUser("target") || interaction.user);

        // Fetch banner (requires fetchUser if not cached)
        const fetchedUser = await user.fetch();
        const bannerURL = fetchedUser.bannerURL({ dynamic: true, size: 1024 });

        const embed = new EmbedBuilder()
            .setTitle(`♨️ Banner: ${user.tag}`)
            .setColor("Blue")
            .setTimestamp()
            .addFields(
                { name: "❤‍🩹 ID", value: `${arrow} ${user.id}`, inline: true },
                { name: "✨ Username", value: `${arrow} ${user.username}`, inline: true },
                { name: "⭐ Banner URL", value: `${arrow} ${bannerURL ? `[Click Here](${bannerURL})` : "No Banner"}`, inline: false }
            );

        if (bannerURL) embed.setImage(bannerURL);

        if (isPrefix) await message.reply({ embeds: [embed] });
        else await interaction.reply({ embeds: [embed] });
    }
};
