const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const axios = require("axios");

const PEXELS_API_KEY = process.env.PEXELS_API_KEY; // set this in Render environment

module.exports = {
  name: "show",
  description: "Fetch images from Pexels with pagination!",
  options: [
    {
      name: "query",
      description: "Search term (e.g., nature, cars, anime)",
      type: 3,
      required: true,
    },
  ],

  async execute({ client, message, interaction, args, isPrefix, safeReply }) {
    try {
      const query = isPrefix
        ? args.join(" ")
        : interaction.options.getString("query");

      if (!query) {
        const reply = { content: "❌ Please provide a search term!", ephemeral: true };
        return isPrefix ? message.reply(reply.content) : safeReply(reply);
      }

      let page = 1;
      const perPage = 1; // show 1 image at a time

      const fetchImages = async (pageNum) => {
        const res = await axios.get("https://api.pexels.com/v1/search", {
          headers: { Authorization: PEXELS_API_KEY },
          params: { query, per_page: perPage, page: pageNum },
        });
        return res.data.photos || [];
      };

      let photos = await fetchImages(page);
      if (!photos.length)
        return isPrefix
          ? message.reply("⚠️ No images found!")
          : safeReply({ content: "⚠️ No images found!", ephemeral: true });

      const sendImage = async () => {
        const photo = photos[0];
        const embed = new EmbedBuilder()
          .setTitle(`📸 ${query} — Page ${page}`)
          .setImage(photo.src.large2x)
          .setColor("Random")
          .setFooter({ text: `Photographer: ${photo.photographer}` });

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("prev")
            .setLabel("⬅️ Previous")
            .setStyle(ButtonStyle.Primary)
            .setDisabled(page === 1),
          new ButtonBuilder()
            .setCustomId("next")
            .setLabel("➡️ Next")
            .setStyle(ButtonStyle.Primary)
        );

        if (isPrefix)
          return message.channel.send({ embeds: [embed], components: [row] });
        else
          return safeReply({ embeds: [embed], components: [row] });
      };

      const sentMsg = await sendImage();

      // Create collector for buttons
      const collector = (sentMsg.createMessageComponentCollector
        ? sentMsg.createMessageComponentCollector({ time: 120000 })
        : sentMsg); // fallback

      collector.on("collect", async (btn) => {
        if (btn.user.id !== (interaction?.user?.id || message.author.id))
          return btn.reply({ content: "Not your session!", ephemeral: true });

        if (btn.customId === "next") page++;
        else if (btn.customId === "prev" && page > 1) page--;

        photos = await fetchImages(page);
        if (!photos.length) return btn.reply({ content: "⚠️ No more images!", ephemeral: true });

        const photo = photos[0];
        const newEmbed = new EmbedBuilder()
          .setTitle(`📸 ${query} — Page ${page}`)
          .setImage(photo.src.large2x)
          .setColor("Random")
          .setFooter({ text: `Photographer: ${photo.photographer}` });

        const newRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("prev")
            .setLabel("⬅️ Previous")
            .setStyle(ButtonStyle.Primary)
            .setDisabled(page === 1),
          new ButtonBuilder()
            .setCustomId("next")
            .setLabel("➡️ Next")
            .setStyle(ButtonStyle.Primary)
        );

        await btn.update({ embeds: [newEmbed], components: [newRow] });
      });

      collector.on("end", async () => {
        try {
          await sentMsg.edit({ components: [] }).catch(() => {});
        } catch {}
      });
    } catch (err) {
      console.error("❌ Show command error:", err);
      if (isPrefix) message.reply("⚠️ Something went wrong fetching images!");
      else safeReply({ content: "⚠️ Something went wrong!", ephemeral: true });
    }
  },
};
