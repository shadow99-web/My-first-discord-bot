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

  async execute(context, args = []) {
    // Detect the type of context
    const isInteraction =
      typeof context.isChatInputCommand === "function" &&
      context.isChatInputCommand();

    const tenorKey = process.env.TENOR_API_KEY;
    const clientKey = process.env.TENOR_CLIENT_KEY;

    let user1, user2;

    // Handle slash command (interaction)
    if (isInteraction) {
      user1 = context.options.getUser("user1");
      user2 = context.options.getUser("user2");
    }
    // Handle prefix command (message)
    else {
      if (!args || args.length < 2) {
        return context.channel?.send("💔 You must mention two users to ship!");
      }

      user1 = context.mentions?.users?.at(0);
      user2 = context.mentions?.users?.at(1);

      if (!user1 || !user2) {
        return context.channel?.send("💔 Please mention two valid users!");
      }
    }

    // Ensure both users are defined
    if (!user1 || !user2) {
      if (isInteraction) {
        return context.reply({ content: "❌ Missing user references!", ephemeral: true });
      } else {
        return context.channel?.send("❌ Missing user references!");
      }
    }

    // Generate a love score
    const loveScore = Math.floor(
      ((user1.id.charCodeAt(0) + user2.id.charCodeAt(0)) * 17) % 101
    );

    // Visualize the love bar 💖
    const filled = "❤️".repeat(Math.floor(loveScore / 10));
    const empty = "🤍".repeat(10 - Math.floor(loveScore / 10));
    const loveBar = `${filled}${empty} (${loveScore}%)`;

    // Determine mood
    const mood =
      loveScore >= 80 ? "romantic" :
      loveScore >= 50 ? "happy" :
      loveScore >= 25 ? "funny" : "sad";

    // Fetch Tenor GIF
    let gifUrl = null;
    try {
      const { data } = await axios.get("https://tenor.googleapis.com/v2/search", {
        params: {
          q: `${mood} love`,
          key: tenorKey,
          client_key: clientKey,
          limit: 20,
        },
      });

      const results = data?.results || [];
      if (results.length > 0) {
        const randomGif = results[Math.floor(Math.random() * results.length)];
        gifUrl = randomGif?.media_formats?.gif?.url || null;
      }
    } catch (error) {
      console.error("Tenor fetch failed:", error);
    }

    // Build embed
    const embed = new EmbedBuilder()
      .setTitle("💘 Love Compatibility 💘")
      .setDescription(
        `**${user1.username}** ❤️ **${user2.username}**

${loveBar}`
      )
      .setColor("LuminousVividPink")
      .setFooter({ text: "💞 True love is calculated by the bot gods." });

    if (gifUrl) embed.setImage(gifUrl);

    // Safe reply handling
    if (isInteraction) {
      await context.reply({ embeds: [embed] });
    } else if (context.channel && typeof context.channel.send === "function") {
      await context.channel.send({ embeds: [embed] });
    } else {
      console.error("Invalid context: no reply or send method found.");
    }
  },
};
