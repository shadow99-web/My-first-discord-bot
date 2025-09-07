const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("boostcount")
        .setDescription("Show total server boosts and level"),

    async execute(context) {
        const arrow = "<:flecha:1414301944868245574>";
        const heart = "<:blue_heart:1414309560231002194>";

        const guild = context.isPrefix ? context.message.guild : context.interaction.guild;

        const boostCount = guild.premiumSubscriptionCount;
        const boostTier = guild.premiumTier ? `Tier ${guild.premiumTier}` : "No Tier";

        const embed = new EmbedBuilder()
            .setTitle(`🚀 Boost Status for ${guild.name}`)
            .setColor("Yellow")
            .setTimestamp()
            .addFields(
                { name: "💎 __Total Boosts__", value: `${arrow} ${boostCount}`, inline: true },
                { name: "📈 __Boost Level__", value: `${heart} ${boostTier}`, inline: true }
            );

        if (context.isPrefix) await context.message.reply({ embeds: [embed] });
        else await context.interaction.reply({ embeds: [embed] });
    }
};
