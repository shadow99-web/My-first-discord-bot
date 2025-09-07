const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

const jokes = [
    "Why don't scientists trust atoms? Because they make up everything!",
    "I told my computer I needed a break, and it said: 'No problem, I'll go to sleep!'",
    "Why did the scarecrow win an award? Because he was outstanding in his field!"
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName("joke")
        .setDescription("Get a random joke"),
    async execute(interaction) {
        const joke = jokes[Math.floor(Math.random() * jokes.length)];

        const embed = new EmbedBuilder()
            .setTitle("😂 Random Joke")
            .setDescription(joke)
            .setColor("Random")
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
