const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("serverbanner")
        .setDescription("Show the server banner"),
    async execute(context) {
        const guild = context.isPrefix ? context.message.guild : context.interaction.guild;
        const bannerURL = guild.bannerURL({ size: 1024 });
        if (!bannerURL) {
            const msg = "📭 This server has no banner!";
            if (context.isPrefix) return context.message.reply(msg);
            else return context.interaction.reply({ content: msg, ephemeral: true });
        }
        const embed = new EmbedBuilder()
            .setTitle(`${guild.name} Banner`)
            .setImage(bannerURL)
            .setColor("Purple")
            .setTimestamp();

        if (context.isPrefix) await context.message.reply({ embeds: [embed] });
        else await context.interaction.reply({ embeds: [embed] });
    }
};
