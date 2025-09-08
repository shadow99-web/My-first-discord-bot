const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("listemojis")
        .setDescription("List all server emojis with copyable format"),

    async execute({ message, interaction, isPrefix, client }) {
        const heart = "<a:blue_heart:1414309560231002194>";
        const user = isPrefix ? message.author : interaction.user;
        const guild = isPrefix ? message.guild : interaction.guild;
        const emojis = guild.emojis.cache;

        if (!emojis.size) {
            const msg = "📭 This server has no emojis!";
            if (isPrefix) return message.reply(msg);
            else return interaction.reply({ content: msg, ephemeral: true });
        }

        const emojiArray = emojis.map(e => ({ display: `${e}`, name: e.name, id: e.id, animated: e.animated }));
        const perPage = 5; // emojis per page
        let page = 0;
        const maxPage = Math.ceil(emojiArray.length / perPage) - 1;

        const generateEmbed = (pg) => {
            return new EmbedBuilder()
                .setTitle(`${heart} Emojis in ${guild.name}`)
                .setColor("Blue")
                .setDescription(
                    emojiArray.slice(pg * perPage, (pg + 1) * perPage)
                        .map((e, idx) => `${idx + 1}. ${e.display} \`:${e.name}:\``)
                        .join("\n")
                )
                .setFooter({ text: `Page ${pg + 1} of ${maxPage + 1}` })
                .setTimestamp();
        };

        const generateButtons = (pg) => {
            const row = new ActionRowBuilder();
            const slice = emojiArray.slice(pg * perPage, (pg + 1) * perPage);
            slice.forEach((e, idx) => {
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`copy_${pg}_${idx}`)
                        .setLabel(`${e.name}`)
                        .setStyle(ButtonStyle.Primary)
                );
            });
            // Add navigation buttons
            row.addComponents(
                new ButtonBuilder().setCustomId('prev').setLabel('⬅️').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('next').setLabel('➡️').setStyle(ButtonStyle.Secondary)
            );
            return row;
        };

        const msg = isPrefix
            ? await message.reply({ embeds: [generateEmbed(page)], components: [generateButtons(page)] })
            : await interaction.reply({ embeds: [generateEmbed(page)], components: [generateButtons(page)], fetchReply: true });

        const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });

        collector.on('collect', async i => {
            if (i.user.id !== user.id) {
                return i.reply({ content: "❌ You can't use these buttons!", ephemeral: true });
            }

            if (i.customId === 'prev') page = page > 0 ? page - 1 : maxPage;
            else if (i.customId === 'next') page = page < maxPage ? page + 1 : 0;
            else if (i.customId.startsWith('copy_')) {
                const [, pgIdx, emojiIdx] = i.customId.split('_');
                const e = emojiArray[pgIdx * perPage + parseInt(emojiIdx)];
                return i.reply({ content: `Copied emoji: \`${e.display}\``, ephemeral: true });
            }

            await i.update({ embeds: [generateEmbed(page)], components: [generateButtons(page)] });
        });

        collector.on('end', () => {
            const disabledRow = new ActionRowBuilder().addComponents(
                generateButtons(page).components.map(b => b.setDisabled(true))
            );
            msg.edit({ components: [disabledRow] }).catch(() => {});
        });
    }
};
