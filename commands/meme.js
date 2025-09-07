const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const fetch = require("node-fetch"); // Make sure to install: npm install node-fetch

module.exports = {
    data: new SlashCommandBuilder()
        .setName("meme")
        .setDescription("Get a random meme"),
    async execute(interaction) {
        const response = await fetch("https://meme-api.com/gimme");
        const data = await response.json();

        const embed = new EmbedBuilder()
            .setTitle(data.title)
            .setImage(data.url)
            .setURL(data.postLink)
            .setColor("Random")
            .setFooter({ text: `From r/${data.subreddit}` })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
