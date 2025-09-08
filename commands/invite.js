const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("invite")
        .setDescription("Get the invite link for this bot"),

    async execute({ message, interaction, isPrefix, client }) {
        const blueHeart = "<a:blue_heart:1414309560231002194>";
        const botName = client.user.tag;
        const clientId = client.user.id;

        // Discord OAuth2 bot invite link with admin permissions (adjust permissions if needed)
        const inviteLink = `https://discord.com/oauth2/authorize?client_id=${clientId}&scope=bot%20applications.commands&permissions=8`;

        const embed = new EmbedBuilder()
            .setTitle(`${blueHeart} Invite ${botName}`)
            .setDescription(`Click the button below to invite **${botName}** to your server!`)
            .setColor("Blue")
            .setTimestamp()
            .setFooter({ text: `Requested by ${isPrefix ? message.author.tag : interaction.user.tag}` });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel("Invite Me")
                .setStyle(ButtonStyle.Link)
                .setURL(inviteLink)
        );

        if (isPrefix) message.reply({ embeds: [embed], components: [row] });
        else interaction.reply({ embeds: [embed], components: [row] });
    }
};
