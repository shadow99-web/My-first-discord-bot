const { EmbedBuilder } = require("discord.js");

// Store last deleted messages per channel
const snipes = new Map();

module.exports = {
  name: "snipe",
  description: "Shows the last deleted message in this channel",

  // ===== Prefix command handler =====
  async execute(message, args, client) {
    const snipe = snipes.get(message.channel.id);

    if (!snipe) {
      return message.reply("❌ There’s nothing to snipe in this channel!");
    }

    const embed = new EmbedBuilder()
      .setAuthor({ name: snipe.author.tag, iconURL: snipe.author.displayAvatarURL() })
      .setDescription(snipe.content || "*[No content, maybe an attachment?]*")
      .setColor("Random")
      .setFooter({ text: `Sniped by ${message.author.tag}` })
      .setTimestamp(snipe.time);

    if (snipe.attachment) {
      embed.setImage(snipe.attachment);
    }

    message.channel.send({ embeds: [embed] });
  },

  // ===== Function to track deleted messages =====
  trackDeleted(msg) {
    if (!msg.author || msg.author.bot) return;

    snipes.set(msg.channel.id, {
      content: msg.content,
      author: msg.author,
      time: new Date(),
      attachment: msg.attachments.first() ? msg.attachments.first().proxyURL : null,
    });

    // Auto clear after 60 sec
    setTimeout(() => snipes.delete(msg.channel.id), 60000);
  },
};
