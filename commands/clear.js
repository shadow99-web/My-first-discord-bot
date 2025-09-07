const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
  name: "clear",
  description: "Clear messages",
  async execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
      return message.reply("❌ You don’t have permission to clear messages.");
    }
    const amount = parseInt(args[0]);
    if (isNaN(amount) || amount <= 0) return message.reply("❌ Enter a valid number.");
    await message.channel.bulkDelete(amount, true);

    const embed = new EmbedBuilder()
      .setColor("Blue")
      .setTitle("🧹 Messages Cleared")
      .setDescription(`${amount} messages cleared by ${message.author.tag}`)
      .setTimestamp();
    message.channel.send({ embeds: [embed] });
  },
};
