const { EmbedBuilder } = require("discord.js");

module.exports = {
  data: { name: "uptime" },
  async execute({ interaction, client, safeReply, message, isPrefix }) {
    const uptime = client.uptime; // milliseconds
    const seconds = Math.floor((uptime / 1000) % 60);
    const minutes = Math.floor((uptime / (1000 * 60)) % 60);
    const hours = Math.floor((uptime / (1000 * 60 * 60)) % 24);
    const days = Math.floor(uptime / (1000 * 60 * 60 * 24));

    const embed = new EmbedBuilder()
      .setColor("Blue")
      .setTitle("⏱ Bot Uptime")
      .setDescription(`**${days}d ${hours}h ${minutes}m ${seconds}s**`)
      .setThumbnail(client.user.displayAvatarURL()) // Bot avatar
      .setFooter({
        text: `Requested by ${isPrefix ? message.author.tag : interaction.user.tag}`,
        iconURL: isPrefix ? message.author.displayAvatarURL() : interaction.user.displayAvatarURL(),
      })
      .setTimestamp();

    // Respond based on prefix or slash
    if (isPrefix && message) {
      return message.channel.send({ embeds: [embed] }).catch(() => {});
    } else if (interaction && safeReply) {
      return safeReply({ embeds: [embed] });
    }
  },
};
