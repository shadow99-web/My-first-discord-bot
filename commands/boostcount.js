const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const heart = "<a:blue_heart:1414309560231002194>";

module.exports = {
    data: new SlashCommandBuilder()
        .setName("boostcount")
        .setDescription("Show total server boosts"),
    async execute(context) {
        const guild = context.isPrefix ? context.message.guild : context.interaction.guild;

        const totalBoosts = guild.premiumSubscriptionCount;
        const boostLevel = guild.premiumTier;
        const boostersList = guild.members.cache
            .filter(m => m.premiumSince)
            .map(m => `${heart} <@${m.id}>`)
            .join("\n") || "No boosters yet";

        const embed = new EmbedBuilder()
            .setTitle(`<a:Gem:1424787118278049813> ${guild.name} Boost Info`)
            .setColor("Blue")
            .setTimestamp()
            .addFields(
                { name: '__Total Boosts__', value: `${heart} ${totalBoosts}`, inline: true },
                { name: '__Boost Level__', value: `${heart} ${boostLevel}`, inline: true },
                { name: '__Boosters__', value: boostersList, inline: false }
            );

        if (context.isPrefix) await context.message.reply({ embeds: [embed] });
        else await context.interaction.reply({ embeds: [embed] });
    }
};
