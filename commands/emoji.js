const { SlashCommandBuilder } = require('discord.js');
const { runEmojiSearch } = require('../Handlers/emojiHandler');

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
