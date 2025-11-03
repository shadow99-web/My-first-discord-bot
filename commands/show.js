const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const axios = require("axios");

module.exports = {
  name: "show",
  description: "Fetch images from Pexels.",
  aliases: ["image", "img", "pexels"],

  data: new SlashCommandBuilder()
    .setName("show")
    .setDescription("Show images from Pexels.")
    .addStringOption(option =>
      option.setName("query")
        .setDescription("Search term (e.g. nature, cars, space)")
        .setRequired(true)
    ),

  async execute(interactionOrMessage, args = [], client) {
    try {
      // 🧠 Detect command type
      const isSlash = interactionOrMessage.isChatInputCommand?.() || interactionOrMessage.commandName;

      const query = isSlash
        ? interactionOrMessage.options.getString("query")
        : args.length > 0
          ? args.join(" ")
          : null;

      if (!query) {
        const content = "❌ Please provide a search term!";
        if (isSlash) return interactionOrMessage.reply({ content, flags: 64 });
        else return interactionOrMessage.channel.send(content);
      }

      let page = 1;
      const perPage = 1;

      const fetchImages = async (pageNum) => {
        try {
          const res = await axios.get("https://api.pexels.com/v1/search", {
            headers: { Authorization: process.env.PEXELS_API_KEY },
            params: { query, per_page: perPage, page: pageNum },
          });
          return res.data.photos || [];
        } catch (err) {
          console.error("Pexels API Error:", err.response?.data || err.message);
          return [];
        }
      };

      // 🕓 Initial reply
      const sent = isSlash
        ? await interactionOrMessage.reply({ content: "🔍 Searching...", fetchReply: true })
        : await interactionOrMessage.channel.send("🔍 Searching...");

      let results = await fetchImages(page);
      if (!results.length)
        return sent.edit("❌ No images found for that search.");

      const sendEmbed = async (photo) => {
        const embed = new EmbedBuilder()
          .setColor("Random")
          .setTitle(`📸 ${query.toUpperCase()}`)
          .setDescription(`Photographer: **${photo.photographer}**`)
          .setImage(photo.src.large2x)
          .setFooter({ text: `Page ${page}` });

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("prev")
            .setLabel("⬅️ Previous")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page === 1),
          new ButtonBuilder()
            .setCustomId("next")
            .setLabel("➡️ Next")
            .setStyle(ButtonStyle.Primary)
        );

        await sent.edit({ content: "", embeds: [embed], components: [row] });
      };

      await sendEmbed(results[0]);

      const collector = sent.createMessageComponentCollector({ time: 120000 });

      collector.on("collect", async (btn) => {
        const userId = isSlash ? interactionOrMessage.user.id : interactionOrMessage.author.id;
        if (btn.user.id !== userId)
          return btn.reply({ content: "⚠️ This isn’t your session!", flags: 64 });

        if (btn.customId === "next") page++;
        else if (btn.customId === "prev" && page > 1) page--;

        const newResults = await fetchImages(page);
        if (newResults.length) await sendEmbed(newResults[0]);
        await btn.deferUpdate();
      });

      collector.on("end", async () => {
        const disabledRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("prev").setLabel("⬅️ Previous").setStyle(ButtonStyle.Secondary).setDisabled(true),
          new ButtonBuilder().setCustomId("next").setLabel("➡️ Next").setStyle(ButtonStyle.Primary).setDisabled(true)
        );
        await sent.edit({ components: [disabledRow] }).catch(() => {});
      });
    } catch (err) {
      console.error("Error in /show command:", err);
    }
  },
};
