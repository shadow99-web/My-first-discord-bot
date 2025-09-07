const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("meme")
        .setDescription("Get a random meme"),
    async execute(interaction) {
        try {
            // Use global fetch (Node 18+)
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
        } catch (error) {
            console.error("Error fetching meme:", error);
            await interaction.reply({ content: "❌ Could not fetch a meme. Try again later!", ephemeral: true });
        }
    }
};
