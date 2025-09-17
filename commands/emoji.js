// commands/emoji.js
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const axios = require('axios');
const EmojiCache = require('../models/EmojiCache');
const UserEmoji = require('../models/UserEmoji');

const ITEMS_PER_PAGE = 5;
const LOTTIE_API_URL = 'https://lottiefiles.com/api/animations/search';

// Fetch emoji animations from LottieFiles
async function fetchFromLottie(keyword) {
  try {
    const response = await axios.get(LOTTIE_API_URL, { params: { q: keyword, limit: 20 } });
    return response.data.animations;
  } catch (err) {
    console.error('❌ Error fetching from LottieFiles:', err);
    return [];
  }
}

// Main search function (used by both slash & prefix)
async function runEmojiSearch(source, keyword, isSlash = true) {
  if (!keyword || keyword.length === 0) {
    const reply = '❌ Please provide a search keyword!';
    return isSlash ? source.reply({ content: reply, ephemeral: true }) : source.channel.send(reply);
  }

  // 1️⃣ Check cache
  let cached = await EmojiCache.findOne({ keyword });
  let results = cached ? cached.results : await fetchFromLottie(keyword);
  if (!results || results.length === 0) {
    const reply = `❌ No emojis found for "${keyword}"`;
    return isSlash ? source.reply({ content: reply, ephemeral: true }) : source.channel.send(reply);
  }
  if (!cached) await EmojiCache.create({ keyword, results });

  // 2️⃣ Pagination
  let page = 0;
  const pages = [];
  for (let i = 0; i < results.length; i += ITEMS_PER_PAGE) pages.push(results.slice(i, i + ITEMS_PER_PAGE));

  const generateEmbed = (pageIndex) => {
    const embed = new EmbedBuilder()
      .setTitle(`Emoji Search: ${keyword}`)
      .setColor('Blue')
      .setDescription(`Page ${pageIndex + 1} of ${pages.length}`);
    const emojis = pages[pageIndex];
    emojis.forEach((item, idx) => {
      const media = item.preview_url;
      embed.addFields({ name: `Emoji ${idx + 1}`, value: `[Preview](${media})` });
      if (idx === 0) embed.setImage(media);
    });
    return embed;
  };

  const createRow = (pageIndex) => {
    const row = new ActionRowBuilder();
    row.addComponents(
      new ButtonBuilder().setCustomId('prev').setLabel('☚').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('next').setLabel('☛').setStyle(ButtonStyle.Primary)
    );
    pages[pageIndex].forEach((_, idx) =>
      row.addComponents(new ButtonBuilder().setCustomId(`add_${idx}`).setLabel(`Add ${idx + 1}`).setStyle(ButtonStyle.Success))
    );
    return row;
  };

  const replyFunc = isSlash ? source.reply.bind(source) : source.channel.send.bind(source.channel);
  const message = await replyFunc({ embeds: [generateEmbed(page)], components: [createRow(page)], fetchReply: true });

  // 3️⃣ Button collector
  const collector = message.createMessageComponentCollector({ time: 120000 });
  collector.on('collect', async i => {
    const userId = i.user.id;
    const authorId = isSlash ? source.user.id : source.author.id;
    if (userId !== authorId) return i.reply({ content: '❌ This is not for you!', ephemeral: true });

    if (i.customId === 'next') page = (page + 1) % pages.length;
    else if (i.customId === 'prev') page = (page - 1 + pages.length) % pages.length;
    else if (i.customId.startsWith('add_')) {
      const idx = parseInt(i.customId.split('_')[1]);
      const item = pages[page][idx];
      const media = item.preview_url;
      if (!media) return i.reply({ content: '❌ Could not fetch this emoji.', ephemeral: true });

      try {
        const emoji = await i.guild.emojis.create({
          attachment: media,
          name: `${keyword}_${idx}`.replace(/\s+/g, '_').toLowerCase()
        });
        await UserEmoji.create({ userId, guildId: i.guild.id, emojiName: emoji.name, emojiUrl: media });
        await i.reply({ content: `✅ Emoji **${emoji.name}** added to the server!`, ephemeral: true });
      } catch (err) {
        await i.reply({
          content: '❌ Could not add emoji. Ensure I have Manage Emojis permission and file is <256KB.',
          ephemeral: true
        });
      }
    }

    if (i.customId === 'next' || i.customId === 'prev') {
      await i.update({ embeds: [generateEmbed(page)], components: [createRow(page)] });
    }
  });

  collector.on('end', () => message.edit({ components: [] }).catch(() => {}));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('emoji')
    .setDescription('Search and add emojis from LottieFiles')
    .addStringOption(option => option.setName('search').setDescription('Keyword to search').setRequired(true)),

  async execute(interaction) {
    if (!interaction || !interaction.isChatInputCommand()) return;
    const keyword = interaction.options.getString('search');
    await runEmojiSearch(interaction, keyword, true);
  },

  async prefixRun(message, args) {
    if (!message || !args || args.length === 0) return message.channel.send('❌ Please provide a search keyword!');
    const keyword = args.join(' ');
    await runEmojiSearch(message, keyword, false);
  }
};
