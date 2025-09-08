const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const heart = "<a:blue_heart:1414309560231002194>";

module.exports = {
    data: new SlashCommandBuilder()
        .setName("serverbanner")
        .setDescription("Get the banner of this server"),

    async execute({ message, interaction, isPrefix }) {
        const guild = isPrefix ? message.guild : interaction.guild;

        if (!guild.banner) {
            const replyMsg = `${heart} This server has no banner set!`;
            if (isPrefix) return message.reply(replyMsg);
            else return interaction.reply({ content: replyMsg, ephemeral: true });
        }

        const bannerURL = guild.bannerURL({ size: 2048 });

        const embed = new EmbedBuilder()
            .setTitle(`${heart} Banner of ${guild.name}`)
            .setImage(bannerURL)
            .setColor("Blue")
            .setTimestamp();

        if (isPrefix) message.reply({ embeds: [embed] });
        else interaction.reply({ embeds: [embed] });
    }
};
