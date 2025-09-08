const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const heart = "<a:blue_heart:1414309560231002194>";

module.exports = {
    data: new SlashCommandBuilder()
        .setName("banner")
        .setDescription("Get the banner of a user")
        .addUserOption(option =>
            option.setName("target").setDescription("Select a user")
        ),

    async execute({ message, interaction, isPrefix }) {
        const user = isPrefix
            ? (message.mentions.users.first() || message.author)
            : (interaction.options.getUser("target") || interaction.user);

        // 🔹 Fetch the full user profile to access banner
        const fetchedUser = await user.fetch(true);

        if (!fetchedUser.banner) {
            const replyMsg = `${heart} ${user.tag} has no banner set!`;
            if (isPrefix) return message.reply(replyMsg);
            else return interaction.reply({ content: replyMsg, ephemeral: true });
        }

        const bannerURL = fetchedUser.bannerURL({ dynamic: true, size: 2048 });

        const embed = new EmbedBuilder()
            .setTitle(`${heart} Banner of ${user.tag}`)
            .setImage(bannerURL)
            .setColor("Blue")
            .setTimestamp();

        if (isPrefix) message.reply({ embeds: [embed] });
        else interaction.reply({ embeds: [embed] });
    }
};
