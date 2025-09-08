const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
    name: "help",
    description: "Show all available commands",
    data: new SlashCommandBuilder()
        .setName("help")
        .setDescription("Get a list of all commands"),

    async execute(context) {
        const blueHeart = "<a:blue_heart_1414309560231002194:1414309560231002194>";
        const client = context.client;
        const guild = context.isPrefix ? context.message.guild : context.interaction.guild;

        // Collect all command names + descriptions
        const commandList = client.commands.map(cmd => {
            return `\`${cmd.name || cmd.data?.name}\` — ${cmd.description || cmd.data?.description || "No description"}`;
        }).join("\n");

        const embed = new EmbedBuilder()
            .setTitle(`${blueHeart} Legendary Help Menu ${blueHeart}`)
            .setDescription(
                `Greetings, warrior! ⚔️\n\n` +
                `Here’s the **legendary arsenal** of commands I wield. ${blueHeart}\n\n` +
                commandList +
                `\n\n✨ More commands will appear here automatically as I grow stronger!`
            )
            .setColor("Blue")
            .setFooter({ 
                text: `Serving proudly in ${guild.name}` 
            })
            .setTimestamp();

        if (context.isPrefix) {
            await context.message.reply({ embeds: [embed] });
        } else {
            await context.interaction.reply({ embeds: [embed] });
        }
    }
};
