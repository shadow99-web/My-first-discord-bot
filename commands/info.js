const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("info")
        .setDescription("Get bot info"),

    async execute(context) {
        const blueHeart = "<a:blue_heart_1414309560231002194:1414309560231002194>";
        const userTag = context.isPrefix ? context.message.author.tag : context.interaction.user.tag;
        const userMention = context.isPrefix ? `<@${context.message.author.id}>` : `<@${context.interaction.user.id}>`;
        const serverName = context.isPrefix ? context.message.guild.name : context.interaction.guild.name;

        const embed = new EmbedBuilder()
            .setTitle(`🤖 Legendary Bot Info ${blueHeart}`)
            .setDescription(`Greetings ${userMention}!\n\nI am a mighty and legendary bot, designed to make your server an epic place to be. From moderating chaos to enhancing fun, I handle it all with style and power. ${blueHeart}\n\nSpecial thanks to **${serverName}** for hosting me!`)
            .addFields(
                { name: "Developer", value: "👑 JEETENDRA ❤", inline: true },
                { name: "Library", value: "Discord.js v14", inline: true },
                { name: "Status", value: "⚡ Active and Legendary", inline: true }
            )
            .setColor("Blue")
            .setFooter({ text: `🤝 Serving with honor for ${serverName}` })
            .setTimestamp();

        if (context.isPrefix) {
            await context.message.reply({ embeds: [embed] });
        } else {
            await context.interaction.reply({ embeds: [embed] });
        }
    }
};
