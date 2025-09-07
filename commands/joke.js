const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("joke")
        .setDescription("Get a random joke"),
    async execute(context) {
        try {
            const response = await fetch("https://v2.jokeapi.dev/joke/Any?type=single");
            const data = await response.json();

            const embed = new EmbedBuilder()
                .setTitle("😂 Random Joke")
                .setDescription(data.joke)
                .setColor("Random")
                .setTimestamp();

            if (context.isPrefix) await context.message.reply({ embeds: [embed] });
            else await context.interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error(error);
            const msg = "❌ Could not fetch a joke. Try again later!";
            if (context.isPrefix) await context.message.reply(msg);
            else await context.interaction.reply({ content: msg, ephemeral: true });
        }
    }
};
