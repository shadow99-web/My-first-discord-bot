const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("avatar")
        .setDescription("Get a user's avatar")
        .addUserOption(option => option.setName("target").setDescription("Select a user")),

    async execute(context) {
        // Emojis
        const arrow = "<a:flecha:1414301944868245574>";
const heart = "<a:blue_heart:1414309560231002194>";
        // User selection
        const user = context.isPrefix
            ? (context.message.mentions.users.first() || context.message.author)
            : (context.interaction.options.getUser("target") || context.interaction.user);

        const avatarURL = user.displayAvatarURL({ dynamic: true, size: 1024 });

        // Embed
        const embed = new EmbedBuilder()
            .setTitle(`❣️ Avatar of ${user.username}`)
            .setColor("Blue")
            .setImage(avatarURL)
            .setTimestamp()
            .setDescription(`${arrow} **Username:** ${user.username}\n${blueHeart} **ID:** ${user.id}`);

        // Download button
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel("📜 Download Avatar")
                .setStyle(ButtonStyle.Link)
                .setURL(avatarURL)
        );

        if (context.isPrefix) {
            await context.message.reply({ embeds: [embed], components: [row] });
        } else {
            await context.interaction.reply({ embeds: [embed], components: [row] });
        }
    }
};
