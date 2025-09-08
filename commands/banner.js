const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("banner")
        .setDescription("Get the profile banner of a user")
        .addUserOption(option => option.setName("target").setDescription("Select a user")),

    async execute({ message, interaction, isPrefix, client }) {
        const blueHeart = "<a:blue_heart:1414309560231002194>";

        const user = isPrefix
            ? (message.mentions.users.first() || message.author)
            : (interaction.options.getUser("target") || interaction.user);

        // Fetch full user (to get banner)
        const fetchedUser = await client.users.fetch(user.id, { force: true });

        if (!fetchedUser.banner) {
            const replyMsg = `❌ ${user.tag} does not have a profile banner set.`;
            if (isPrefix) return message.reply(replyMsg);
            else return interaction.reply({ content: replyMsg, ephemeral: true });
        }

        const bannerURL = fetchedUser.bannerURL({ dynamic: true, size: 1024 });

        const embed = new EmbedBuilder()
            .setTitle(`${blueHeart} Banner of ${user.tag}`)
            .setImage(bannerURL)
            .setColor("Blue")
            .setTimestamp();

        if (isPrefix) message.reply({ embeds: [embed] });
        else interaction.reply({ embeds: [embed] });
    }
};
