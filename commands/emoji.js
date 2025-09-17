// commands/emoji.js
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const axios = require('axios');
const EmojiCache = require('../models/EmojiCache');
const UserEmoji = require('../models/UserEmoji');

const ITEMS_PER_PAGE = 5;
const LOTTIE_API_URL = 'https://lottiefiles.com/api/animations/search';

// Fetch animations from LottieFiles
async function fetchFromLottie(keyword) {
  const response = await axios.get(LOTTIE_API_URL, { params: { q: keyword, limit: 20 } });
  return response.data.animations;
}

// Main function for both slash and prefix commands
async function runEmojiSearch(interactionOrMessage, keyword, isSlash = true) {
  // 1️⃣ Check cache
  let results = await EmojiCache.findOne({ keyword });
  if (results) results = results.results;
  else {
    results = await fetchFromLottie(keyword);
    if (!results || results.length === 0) {
      const reply = '❌ No emojis found!';
      return isSlash ? interactionOrMessage.reply({ content: reply, ephemeral: true }) : interactionOrMessage.channel.send(reply);
    }
    await EmojiCache.create({ keyword, results });
  }

  // 2️⃣ Pagination setup
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
      const media = item.preview_url; // Lottie preview URL
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
      row.addComponents(
        new ButtonBuilder().setCustomId(`add_${idx}`).setLabel(`Add ${idx + 1}`).setStyle(ButtonStyle.Success)
      )
    );
    return row;
  };

  const replyFunc = isSlash
    ? interactionOrMessage.reply.bind(interactionOrMessage)
    : interactionOrMessage.channel.send.bind(interactionOrMessage.channel);

  const message = await replyFunc({ embeds: [generateEmbed(page)], components: [createRow(page)], fetchReply: true });

  // 3️⃣ Button collector
  const collector = message.createMessageComponentCollector({ time: 120000 });
  collector.on('collect', async i => {
    const userId = i.user.id;
    const authorId = isSlash ? interactionOrMessage.user.id : interactionOrMessage.author.id;
    if (userId !== authorId) return i.reply({ content: 'This is not for you!', ephemeral: true });

    if (i.customId === 'next') page = (page + 1) % pages.length;
    else if (i.customId === 'prev') page = (page - 1 + pages.length) % pages.length;
    else if (i.customId.startsWith('add_')) {
      const idx = parseInt(i.customId.split('_')[1]);
      const item = pages[page][idx];
      const media = item.preview_url;
      if (!media) return i.reply({ content: '❌ Could not fetch this emoji.', ephemeral: true });

      try {
        const emoji = await i.guild.emojis.create({ attachment: media, name: `${keyword}_${idx}`.replace(/\s+/g, '_').toLowerCase() });
        await UserEmoji.create({ userId, guildId: i.guild.id, emojiName: emoji.name, emojiUrl: media });
        await i.reply({ content: `✅ Emoji **${emoji.name}** added to the server!`, ephemeral: true });
      } catch (err) {
        await i.reply({ content: '❌ Could not add emoji. Ensure I have Manage Emojis permission and file is <256KB.', ephemeral: true });
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
    .setDescription('Search for emoji animations')
    .addStringOption(option => option.setName('search').setDescription('Keyword to search').setRequired(true)),
  async execute(interaction) {
    const keyword = interaction.options.getString('search');
    runEmojiSearch(interaction, keyword, true);
  },
  async prefixRun(message, args) {
    if (!args.length) return message.channel.send('❌ Please provide a search keyword!');
    const keyword = args.join(' ');
    runEmojiSearch(message, keyword, false);
  }
};
