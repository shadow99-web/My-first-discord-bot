const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

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

        const emojiArray = emojis.map(e => ({
            label: e.name,
            value: `${e} \`:${e.name}:\``
        }));

        // Pagination settings
        const pageSize = 10;
        let page = 0;
        const totalPages = Math.ceil(emojiArray.length / pageSize);

        const generateEmbed = (pageIndex) => {
            const start = pageIndex * pageSize;
            const end = start + pageSize;
            const pageEmojis = emojiArray.slice(start, end);

            return new EmbedBuilder()
                .setTitle(`😎 Emojis in ${guild.name} (${pageIndex + 1}/${totalPages})`)
                .setDescription(pageEmojis.map(e => e.value).join("\n"))
                .setColor("Yellow")
                .setTimestamp();
        };

        // Generate buttons
        const generateButtons = () => {
            const prev = new ButtonBuilder()
                .setCustomId("prev")
                .setLabel("◀️ Prev")
                .setStyle(ButtonStyle.Primary)
                .setDisabled(page === 0);

            const next = new ButtonBuilder()
                .setCustomId("next")
                .setLabel("Next ▶️")
                .setStyle(ButtonStyle.Primary)
                .setDisabled(page === totalPages - 1);

            return [new ActionRowBuilder().addComponents(prev, next)];
        };

        const replyOptions = {
            embeds: [generateEmbed(page)],
            components: generateButtons()
        };

        // Send reply
        const msg = context.isPrefix
            ? await context.message.reply(replyOptions)
            : await context.interaction.reply({ ...replyOptions, fetchReply: true });

        // Button interaction collector
        const filter = i => i.user.id === (context.isPrefix ? context.message.author.id : context.interaction.user.id);
        const collector = msg.createMessageComponentCollector({ filter, time: 60000 });

        collector.on("collect", async i => {
            if (i.customId === "prev") page--;
            if (i.customId === "next") page++;
            await i.update({ embeds: [generateEmbed(page)], components: generateButtons() });
        });
    }
};
