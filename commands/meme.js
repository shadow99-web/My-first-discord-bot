const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("meme")
        .setDescription("Get a random meme"),
    async execute(context) {
        try {
            const response = await fetch("https://meme-api.com/gimme");
            const data = await response.json();

            const embed = new EmbedBuilder()
                .setTitle(data.title)
                .setImage(data.url)
                .setURL(data.postLink)
                .setFooter({ text: `From r/${data.subreddit}` })
                .setColor("Random")
                .setTimestamp();

            if (context.isPrefix) await context.message.reply({ embeds: [embed] });
            else await context.interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error(error);
            const msg = "❌ Could not fetch a meme. Try again later!";
            if (context.isPrefix) await context.message.reply(msg);
            else await context.interaction.reply({ content: msg, ephemeral: true });
        }
    }
};
