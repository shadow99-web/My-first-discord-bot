const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const axios = require("axios");

module.exports = {
  name: "show",
  description: "Fetch beautiful images from Pexels.",
  aliases: ["image", "img", "pexels"],
  data: new SlashCommandBuilder()
    .setName("show")
    .setDescription("Show beautiful images from Pexels.")
    .addStringOption(option =>
      option.setName("query").setDescription("Search term (e.g. nature, cars, space)").setRequired(true)
    ),

  async execute(messageOrInteraction, args) {
    const isSlash = !!messageOrInteraction.isCommand;
    const query = isSlash ? messageOrInteraction.options.getString("query") : args.join(" ");
    const channel = isSlash ? messageOrInteraction : messageOrInteraction.channel;

    if (!query) return channel.reply("❌ Please provide a search term!");

    let page = 1;
    const perPage = 1;

    async function fetchImages(pageNum) {
      const res = await axios.get("https://api.pexels.com/v1/search", {
        headers: { Authorization: process.env.PEXELS_API_KEY },
        params: { query, per_page: perPage, page: pageNum },
      });
      return res.data.photos || [];
    }

    const sent = await (isSlash ? messageOrInteraction.reply({ content: "🔍 Searching...", fetchReply: true }) : channel.send("🔍 Searching..."));
    let results = await fetchImages(page);

    if (!results.length) {
      return sent.edit("❌ No images found for that search.");
    }

    const sendEmbed = async (photo) => {
      const embed = new EmbedBuilder()
        .setColor("Random")
        .setTitle(`📸 ${query.toUpperCase()}`)
        .setDescription(`Photographer: **${photo.photographer}**`)
        .setImage(photo.src.large2x)
        .setFooter({ text: `Page ${page}` });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("prev").setLabel("⬅️ Previous").setStyle(ButtonStyle.Secondary).setDisabled(page === 1),
        new ButtonBuilder().setCustomId("next").setLabel("➡️ Next").setStyle(ButtonStyle.Primary)
      );

      await sent.edit({ content: "", embeds: [embed], components: [row] });
    };

    await sendEmbed(results[0]);

    const collector = sent.createMessageComponentCollector({ time: 120000 });

    collector.on("collect", async (interaction) => {
      if (interaction.user.id !== (isSlash ? messageOrInteraction.user.id : messageOrInteraction.author.id))
        return interaction.reply({ content: "⚠️ This is not your session!", ephemeral: true });

      if (interaction.customId === "next") page++;
      else if (interaction.customId === "prev" && page > 1) page--;

      const newResults = await fetchImages(page);
      if (newResults.length) await sendEmbed(newResults[0]);
      await interaction.deferUpdate();
    });

    collector.on("end", async () => {
      const disabledRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("prev").setLabel("⬅️ Previous").setStyle(ButtonStyle.Secondary).setDisabled(true),
        new ButtonBuilder().setCustomId("next").setLabel("➡️ Next").setStyle(ButtonStyle.Primary).setDisabled(true)
      );
      await sent.edit({ components: [disabledRow] }).catch(() => {});
    });
  },
};
