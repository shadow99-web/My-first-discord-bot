const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("avatar")
        .setDescription("Get the avatar of a user")
        .addUserOption(option =>
            option.setName("target")
                .setDescription("Select a user")
        ),

    async execute({ message, interaction, isPrefix }) {
        const blueHeart = "<a:blue_heart:1414309560231002194>";

        // ✅ Target user
        const user = isPrefix
            ? (message.mentions.users.first() || message.author)
            : (interaction.options.getUser("target") || interaction.user);

        const avatarURL = user.displayAvatarURL({ dynamic: true, size: 1024 });

        // ✅ Embed
        const embed = new EmbedBuilder()
            .setTitle(`${blueHeart} Avatar of ${user.username}`)
            .setDescription(`${blueHeart} [Click here to download](${avatarURL})`)
            .setImage(avatarURL)
            .setColor("Blue")
            .setTimestamp()
            .setFooter({ text: `Requested by ${isPrefix ? message.author.tag : interaction.user.tag}` });

        if (isPrefix) {
            await message.reply({ embeds: [embed] });
        } else {
            await interaction.reply({ embeds: [embed] });
        }
    }
};
