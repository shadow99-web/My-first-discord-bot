// commands/emoji.js
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const axios = require('axios');

const TENOR_API_KEY = 'YOUR_TENOR_API_KEY'; // Get from https://tenor.com/developer
const ITEMS_PER_PAGE = 5; // Emojis per page

module.exports = {
    data: new SlashCommandBuilder()
        .setName('emoji')
        .setDescription('Search emojis and add to your server')
        .addStringOption(option =>
            option.setName('search')
            .setDescription('Keyword to search for emoji')
            .setRequired(true)
        ),
    async execute(interaction) {
        const query = interaction.options.getString('search');

        // Fetch 20 results from Tenor
        const response = await axios.get(`https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(query)}&key=${TENOR_API_KEY}&limit=20`);
        const results = response.data.results;

        if (!results || results.length === 0) return interaction.reply({ content: '❌ No emojis found!', ephemeral: true });

        let page = 0;
        const pages = [];
        for (let i = 0; i < results.length; i += ITEMS_PER_PAGE) {
            pages.push(results.slice(i, i + ITEMS_PER_PAGE));
        }

        const generateEmbed = (pageIndex) => {
            const embed = new EmbedBuilder()
                .setTitle(`Emoji Search: ${query}`)
                .setColor('Blue')
                .setDescription(`Page ${pageIndex + 1} of ${pages.length}`);
            const emojis = pages[pageIndex];
            emojis.forEach((item, idx) => {
                const media = item.media_formats.gif || item.media_formats.tinygif || item.media_formats.nanogif;
                if (media) embed.addFields({ name: `Emoji ${idx + 1}`, value: `[Click to view](${media.url})` });
                if (idx === 0) embed.setImage(media.url); // show first emoji as main image
            });
            return embed;
        };

        const createRow = (pageIndex) => {
            const row = new ActionRowBuilder();
            row.addComponents(
                new ButtonBuilder().setCustomId('prev').setLabel('☚').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('next').setLabel('☛').setStyle(ButtonStyle.Primary)
            );
            pages[pageIndex].forEach((_, idx) => {
                row.addComponents(
                    new ButtonBuilder().setCustomId(`add_${idx}`).setLabel(`Add ${idx + 1}`).setStyle(ButtonStyle.Success)
                );
            });
            return row;
        };

        const message = await interaction.reply({ embeds: [generateEmbed(page)], components: [createRow(page)], fetchReply: true });

        const collector = message.createMessageComponentCollector({ time: 120000 });

        collector.on('collect', async i => {
            if (i.user.id !== interaction.user.id) return i.reply({ content: 'This is not for you!', ephemeral: true });

            if (i.customId === 'next') {
                page = (page + 1) % pages.length;
                await i.update({ embeds: [generateEmbed(page)], components: [createRow(page)] });
            } else if (i.customId === 'prev') {
                page = (page - 1 + pages.length) % pages.length;
                await i.update({ embeds: [generateEmbed(page)], components: [createRow(page)] });
            } else if (i.customId.startsWith('add_')) {
                const idx = parseInt(i.customId.split('_')[1]);
                const item = pages[page][idx];
                const media = item.media_formats.gif || item.media_formats.tinygif || item.media_formats.nanogif;
                if (!media) return i.reply({ content: '❌ Could not fetch this emoji.', ephemeral: true });

                try {
                    await interaction.guild.emojis.create({
                        attachment: media.url,
                        name: `${query}_${idx}`.replace(/\s+/g, '_').toLowerCase(),
                        reason: `Emoji added by ${interaction.user.tag}`
                    });
                    await i.reply({ content: '✅ Emoji added to the server!', ephemeral: true });
                } catch (err) {
                    await i.reply({ content: '❌ Could not add emoji. Make sure I have Manage Emojis permission and the file is <256KB.', ephemeral: true });
                }
            }
        });

        collector.on('end', () => {
            message.edit({ components: [] }).catch(() => {});
        });
    }
};
