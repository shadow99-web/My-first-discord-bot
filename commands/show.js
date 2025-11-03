const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const axios = require("axios");

const PEXELS_API_KEY = process.env.PEXELS_API_KEY; // set in Render / Galactic env

module.exports = {
  // Slash metadata (so your deploy script picks it up)
  data: new SlashCommandBuilder()
    .setName("show")
    .setDescription("Fetch images from Pexels with pagination")
    .addStringOption((o) =>
      o.setName("query").setDescription("Search term (e.g. nature)").setRequired(true)
    ),

  // meta for prefix loader (optional)
  name: "show",
  description: "Fetch images from Pexels with pagination (prefix + slash)",

  /**
   * execute(context)
   * context: { client, message, interaction, args, isPrefix, safeReply }
   */
  async execute(context) {
    const { message, interaction, args, isPrefix } = context;
    try {
      const isSlash = !!interaction;
      const userId = isSlash ? interaction.user.id : message.author.id;

      // get query
      const query = isSlash
        ? interaction.options.getString("query")
        : args?.join(" ").trim();

      if (!query) {
        const reply = { content: "❌ Please provide a search term!", ephemeral: true };
        if (isSlash) return interaction.reply(reply).catch(() => {});
        return message.reply(reply.content).catch(() => {});
      }

      // per-page and page state
      let page = 1;
      const perPage = 1;

      // fetch function
      const fetchImages = async (pageNum) => {
        const res = await axios.get("https://api.pexels.com/v1/search", {
          headers: { Authorization: PEXELS_API_KEY },
          params: { query, per_page: perPage, page: pageNum },
          timeout: 15000,
        });
        return res.data.photos || [];
      };

      // initial fetch
      let photos = await fetchImages(page);
      if (!photos.length) {
        const no = { content: `⚠️ No images found for \`${query}\`.`, ephemeral: true };
        if (isSlash) return interaction.reply(no).catch(() => {});
        return message.reply(no.content).catch(() => {});
      }

      // build embed + buttons
      const buildEmbed = (photo, pageNum) =>
        new EmbedBuilder()
          .setTitle(`✨SHADOW GALLERY ${query} — Page ${pageNum}`)
          .setImage(photo.src.large2x)
          .setColor("Random")
          .setFooter({ text: `Photographer: ${photo.photographer}` });

      const buildRow = (pageNum) =>
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("show_prev")
            .setLabel("⬅️ Previous")
            .setStyle(ButtonStyle.Primary)
            .setDisabled(pageNum === 1),
          new ButtonBuilder()
            .setCustomId("show_next")
            .setLabel("➡️ Next")
            .setStyle(ButtonStyle.Primary)
        );

      // send initial message (fetchReply for slash so we get message object)
      const initialEmbed = buildEmbed(photos[0], page);
      const initialRow = buildRow(page);

      let sentMsg;
      if (isSlash) {
        // reply with fetchReply so we get the Message object
        sentMsg = await interaction.reply({
          embeds: [initialEmbed],
          components: [initialRow],
          fetchReply: true,
        });
      } else {
        sentMsg = await message.channel.send({
          embeds: [initialEmbed],
          components: [initialRow],
        });
      }

      // create collector
      const collector = sentMsg.createMessageComponentCollector({
        time: 120_000,
      });

      collector.on("collect", async (btn) => {
        try {
          // only allow the command user to control pagination
          if (btn.user.id !== userId) {
            return btn.reply({ content: "This is not your session.", ephemeral: true });
          }

          // update page
          if (btn.customId === "show_next") page++;
          else if (btn.customId === "show_prev" && page > 1) page--;

          // fetch the page
          photos = await fetchImages(page);
          if (!photos.length) {
            // nothing on that page — revert page and inform user
            if (btn.customId === "show_next") page--;
            else if (btn.customId === "show_prev" && page < 1) page++;
            return btn.reply({ content: "⚠️ No more images.", ephemeral: true });
          }

          const photo = photos[0];
          const newEmbed = buildEmbed(photo, page);
          const newRow = buildRow(page);

          // update message
          await btn.update({ embeds: [newEmbed], components: [newRow] });
        } catch (err) {
          console.error("Collector collect error (show):", err);
          try {
            await btn.reply({ content: "⚠️ Something went wrong.", ephemeral: true });
          } catch {}
        }
      });

      collector.on("end", async () => {
        try {
          await sentMsg.edit({ components: [] }).catch(() => {});
        } catch {}
      });
    } catch (err) {
      console.error("❌ Show command error:", err);
      if (isPrefix) {
        try {
          await message.reply("⚠️ Something went wrong fetching images.").catch(() => {});
        } catch {}
      } else {
        try {
          await interaction.reply({ content: "⚠️ Something went wrong fetching images.", ephemeral: true }).catch(() => {});
        } catch {}
      }
    }
  },
};
