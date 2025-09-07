const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("listemojis")
        .setDescription("List all server emojis with copyable format"),
    async execute(context) {
        const guild = context.isPrefix ? context.message.guild : context.interaction.guild;
        const emojis = guild.emojis.cache;

        if (!emojis.size) {
            const msg = "📭 This server has no emojis!";
            if (context.isPrefix) return context.message.reply(msg);
            else return context.interaction.reply({ content: msg, ephemeral: true });
        }

        const emojiList = emojis.map(e => `${e} \`:${e.name}:\``).join("\n");

        const embed = new EmbedBuilder()
            .setTitle(`😎 Emojis in ${guild.name}`)
            .setDescription(emojiList)
            .setColor("Yellow")
            .setTimestamp();

        if (context.isPrefix) await context.message.reply({ embeds: [embed] });
        else await context.interaction.reply({ embeds: [embed] });
    }
};
