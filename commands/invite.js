const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("invite")
        .setDescription("Get the invite link for this bot"),

    async execute({ message, interaction, isPrefix, client }) {
        const blueHeart = "<a:blue_heart:1414309560231002194>";
        const botName = client.user.tag;
        const clientId = client.user.id;

        // Discord OAuth2 bot invite link with admin permissions (you can adjust permissions if needed)
        const inviteLink = `https://discord.com/oauth2/authorize?client_id=${clientId}&scope=bot%20applications.commands&permissions=8`;

        const embed = new EmbedBuilder()
            .setTitle(`${blueHeart} Invite ${botName}`)
            .setDescription(`Click the link below to invite **${botName}** to your server:\n\n[Invite Me](${inviteLink})`)
            .setColor("Blue")
            .setTimestamp()
            .setFooter({ text: `Requested by ${isPrefix ? message.author.tag : interaction.user.tag}` });

        if (isPrefix) message.reply({ embeds: [embed] });
        else interaction.reply({ embeds: [embed] });
    }
};
