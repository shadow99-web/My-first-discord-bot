const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const axios = require("axios");
const sharp = require("sharp");
const fs = require("fs");
const tinify = require("tinify");

tinify.key = process.env.TINYPNG_KEY;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("gif")
    .setDescription("Search for a GIF via Tenor")
    .addStringOption(option =>
      option
        .setName("query")
        .setDescription("What GIF do you want?")
        .setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply();
    const query = interaction.options.getString("query");

    try {
      const tenorKey = process.env.TENOR_API_KEY;
      const clientKey = process.env.TENOR_CLIENT_KEY;
      const limit = 10;

      const url = `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(
        query
      )}&key=${tenorKey}&client_key=${clientKey}&limit=${limit}&media_filter=gif`;

      const res = await axios.get(url);
      const results = res.data.results;

      if (!results || !results.length)
        return interaction.editReply(`⚠️ No GIFs found for **${query}**.`);

      let index = 0;

      const getEmbed = () => {
        const gifUrl = results[index].media_formats.gif.url;
        return new EmbedBuilder()
          .setTitle(`🎬 GIF result: ${query}`)
          .setImage(gifUrl)
          .setFooter({
            text: `Result ${index + 1}/${results.length} | Powered by Tenor`,
          })
          .setColor("Aqua");
      };

      const getButtons = () => {
        return new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("prev")
            .setLabel("◀️")
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId("next")
            .setLabel("▶️")
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId("add_static")
            .setLabel("🧊 Add Static Emoji")
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId("add_animated")
            .setLabel("⚡ Add Animated Emoji")
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId("add_sticker")
            .setLabel("💖 Add Sticker")
            .setStyle(ButtonStyle.Danger)
        );
      };

      let msg = await interaction.editReply({
        embeds: [getEmbed()],
        components: [getButtons()],
        fetchReply: true,
      });

      const collector = msg.createMessageComponentCollector({ time: 90_000 });

      collector.on("collect", async btn => {
        if (btn.user.id !== interaction.user.id)
          return btn.reply({
            content: "⛔ That button isn’t for you!",
            ephemeral: true,
          });

        const gifUrl = results[index].media_formats.gif.url;

        if (btn.customId === "next") {
          index = (index + 1) % results.length;
          return btn.update({ embeds: [getEmbed()] });
        }
        if (btn.customId === "prev") {
          index = (index - 1 + results.length) % results.length;
          return btn.update({ embeds: [getEmbed()] });
        }

        // 🧊 Static Emoji (first frame)
        if (btn.customId === "add_static") {
          await btn.deferReply({ ephemeral: true });
          const imgBuffer = (await axios.get(gifUrl, { responseType: "arraybuffer" })).data;
          const pngBuffer = await sharp(imgBuffer, { animated: true })
            .extractFrame(0)
            .resize(128, 128)
            .png()
            .toBuffer();

          const emoji = await interaction.guild.emojis.create({
            attachment: pngBuffer,
            name: `gif_static_${index}`,
          });

          return btn.editReply(`🧊 Added static emoji: ${emoji}`);
        }

        // ⚡ Animated Emoji (TinyPNG compression)
        if (btn.customId === "add_animated") {
          await btn.deferReply({ ephemeral: true });
          try {
            const source = await tinify.fromUrl(gifUrl);
            const compressedBuffer = await source.toBuffer();

            const emoji = await interaction.guild.emojis.create({
              attachment: compressedBuffer,
              name: `gif_animated_${index}`,
            });

            return btn.editReply(`⚡ Added animated emoji: ${emoji}`);
          } catch (err) {
            console.error("TinyGIF compression failed:", err);
            return btn.editReply("❌ Failed to compress or upload the animated GIF.");
          }
        }

        // 💖 Add as Sticker
        if (btn.customId === "add_sticker") {
          await btn.deferReply({ ephemeral: true });
          try {
            const source = await tinify.fromUrl(gifUrl);
            const compressedBuffer = await source.toBuffer();

            const stickerName = `sticker_${index}`;
            await interaction.guild.stickers.create({
              file: compressedBuffer,
              name: stickerName,
              tags: "funny gif",
            });

            return btn.editReply(`💖 Added sticker: **${stickerName}**`);
          } catch (err) {
            console.error("Sticker upload error:", err);
            return btn.editReply("❌ Failed to add sticker. Check size or permissions.");
          }
        }
      });

      collector.on("end", () => {
        msg.edit({ components: [] }).catch(() => {});
      });
    } catch (e) {
      console.error("GIF command error:", e);
      interaction.editReply("❌ Something went wrong fetching GIFs.");
    }
  },
};
