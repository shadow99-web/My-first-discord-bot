const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const axios = require("axios");

module.exports = {
  name: "ship",
  description: "Ship two users together 💘",
  aliases: ["love"],

  data: new SlashCommandBuilder()
    .setName("ship")
    .setDescription("💞 Ship two users together!")
    .addUserOption(option =>
      option.setName("user1").setDescription("First user").setRequired(true)
    )
    .addUserOption(option =>
      option.setName("user2").setDescription("Second user").setRequired(true)
    ),

  async execute({ interaction, safeReply }) {
    const user1 = interaction.options.getUser("user1");
    const user2 = interaction.options.getUser("user2");

    if (!user1 || !user2) {
      return safeReply({ content: "❌ Both users must be mentioned!", ephemeral: true });
    }

    const loveScore = Math.floor(((user1.id.charCodeAt(0) + user2.id.charCodeAt(0)) * 17) % 101);
    const filled = "❤️".repeat(Math.floor(loveScore / 10));
    const empty = "🤍".repeat(10 - Math.floor(loveScore / 10));
    const loveBar = `${filled}${empty} (${loveScore}%)`;

    const mood = loveScore >= 80 ? "romantic" : loveScore >= 50 ? "happy" : loveScore >= 25 ? "funny" : "sad";

    let gifUrl = null;
    try {
      const { data } = await axios.get("https://tenor.googleapis.com/v2/search", {
        params: {
          q: `${mood} love`,
          key: process.env.TENOR_API_KEY,
          client_key: process.env.TENOR_CLIENT_KEY,
          limit: 20
        }
      });

      const results = data?.results || [];
      if (results.length > 0) {
        gifUrl = results[Math.floor(Math.random() * results.length)]?.media_formats?.gif?.url;
      }
    } catch (err) {
      console.error("Tenor fetch failed:", err);
    }

    const embed = new EmbedBuilder()
      .setTitle("💘 Love Compatibility 💘")
      .setDescription(`**${user1.username}** ❤️ **${user2.username}**

${loveBar}`)
      .setColor("LuminousVividPink")
      .setFooter({ text: "💞 True love is calculated by the bot gods." });

    if (gifUrl) embed.setImage(gifUrl);

    return safeReply({ embeds: [embed] });
  },
};
