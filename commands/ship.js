const {
  SlashCommandBuilder,
  EmbedBuilder,
} = require("discord.js");
const axios = require("axios");

module.exports = {
  name: "ship",
  description: "Ship two users together 💘",
  aliases: ["love"], // For prefix version
  data: new SlashCommandBuilder()
    .setName("ship")
    .setDescription("💞 Ship two users together!")
    .addUserOption(option =>
      option.setName("user1").setDescription("First user").setRequired(true)
    )
    .addUserOption(option =>
      option.setName("user2").setDescription("Second user").setRequired(true)
    ),

  async execute(context, args) {
    const isInteraction = !!context.isChatInputCommand;
    const guild = isInteraction ? context.guild : context.guild;
    const tenorKey = process.env.TENOR_API_KEY;
    const clientKey = process.env.TENOR_CLIENT_KEY;

    let user1, user2;

    // For slash command
    if (isInteraction) {
      user1 = context.options.getUser("user1");
      user2 = context.options.getUser("user2");
    } else {
      // For prefix command: !ship @user1 @user2
      if (args.length < 2)
        return context.reply("💔 You must mention two users to ship!");

      user1 = context.mentions.users.at(0);
      user2 = context.mentions.users.at(1);

      if (!user1 || !user2)
        return context.reply("💔 Please mention two valid users!");
    }

    // Generate a "consistent" random score
    const loveScore = Math.floor(
      ((user1.id.charCodeAt(0) + user2.id.charCodeAt(0)) * 17) % 101
    );

    // Heart bar visualization 💖
    const filled = "❤️".repeat(Math.floor(loveScore / 10));
    const empty = "🤍".repeat(10 - Math.floor(loveScore / 10));
    const loveBar = `${filled}${empty} (${loveScore}%)`;

    // Choose mood based on love score
    let mood = "neutral";
    if (loveScore >= 80) mood = "romantic";
    else if (loveScore >= 50) mood = "happy";
    else if (loveScore >= 25) mood = "funny";
    else mood = "sad";

    // Fetch a GIF from Tenor 💞
    let gifUrl;
    try {
      const tenorRes = await axios.get(
        `https://tenor.googleapis.com/v2/search?q=${mood}%20love&key=${tenorKey}&client_key=${clientKey}&limit=20`
      );
      const results = tenorRes.data.results;
      gifUrl =
        results[Math.floor(Math.random() * results.length)]?.media_formats?.gif
          ?.url || null;
    } catch (err) {
      console.error("Tenor fetch failed:", err);
    }

    const embed = new EmbedBuilder()
      .setTitle("💘 Love Compatibility 💘")
      .setDescription(
        `**${user1.username}** ❤️ **${user2.username}**\n\n${loveBar}`
      )
      .setColor("LuminousVividPink")
      .setFooter({ text: "💞 True love is calculated by the bot gods." });

    if (gifUrl) embed.setImage(gifUrl);

    if (isInteraction)
      await context.reply({ embeds: [embed] });
    else context.reply({ embeds: [embed] });
  },
};
