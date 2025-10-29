const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

module.exports = {
  name: "gif2emoji",
  description: "Search Tenor GIFs and save one as an animated emoji",
  data: new SlashCommandBuilder()
    .setName("gif2emoji")
    .setDescription("Search and save a GIF as an animated emoji")
    .addStringOption((option) =>
      option
        .setName("query")
        .setDescription("Enter the GIF search term")
        .setRequired(true)
    ),

  async execute({ client, interaction, message, args, isPrefix }) {
    let query;
    if (isPrefix) {
      if (!args.length) return message.reply("⚠️ Usage: `!gif2emoji <search term>`");
      query = args.join(" ");
    } else {
      query = interaction.options.getString("query");
      await interaction.deferReply();
    }

    try {
      const tenorKey = process.env.TENOR_API_KEY;
      const tenorClientKey = process.env.TENOR_CLIENT_KEY;
      if (!tenorKey || !tenorClientKey) {
        const msg = "❌ Missing TENOR API keys.";
        return isPrefix ? message.reply(msg) : interaction.editReply(msg);
      }

      // 🎬 Fetch Tenor GIFs
      const url = `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(
        query
      )}&key=${tenorKey}&client_key=${tenorClientKey}&limit=10&media_filter=gif`;

      const resp = await axios.get(url);
      const results = resp.data.results;
      if (!results || results.length === 0)
        return isPrefix
          ? message.reply(`⚠️ No GIFs found for **${query}**`)
          : interaction.editReply(`⚠️ No GIFs found for **${query}**`);

      let index = 0;

      const getEmbed = () =>
        new EmbedBuilder()
          .setTitle(`🎞️ GIF Search: ${query}`)
          .setImage(results[index].media_formats.gif.url)
          .setFooter({ text: `Result ${index + 1}/${results.length}` })
          .setColor("Blurple");

      const getButtons = () =>
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("prev").setLabel("◀️").setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId("next").setLabel("▶️").setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId("save_emoji")
            .setLabel("💾 Save as Emoji")
            .setStyle(ButtonStyle.Success)
        );

      const sent = isPrefix
        ? await message.reply({ embeds: [getEmbed()], components: [getButtons()] })
        : await interaction.editReply({ embeds: [getEmbed()], components: [getButtons()] });

      const collector = sent.createMessageComponentCollector({ time: 60_000 });

      collector.on("collect", async (btn) => {
        const userId = isPrefix ? message.author.id : interaction.user.id;
        if (btn.user.id !== userId)
          return btn.reply({ content: "⛔ That’s not your menu!", ephemeral: true });

        const currentGif = results[index].media_formats.gif.url;

        // 🔁 Navigation
        if (btn.customId === "next") index = (index + 1) % results.length;
        else if (btn.customId === "prev") index = (index - 1 + results.length) % results.length;

        // 💾 Save as animated emoji
        else if (btn.customId === "save_emoji") {
          const tempGif = path.join(__dirname, `temp_${Date.now()}.gif`);
          const compressedGif = path.join(__dirname, `compressed_${Date.now()}.gif`);

          try {
            // Download GIF
            const response = await axios.get(currentGif, { responseType: "arraybuffer" });
            fs.writeFileSync(tempGif, Buffer.from(response.data, "binary"));

            // Compress GIF to fit Discord limits (256KB)
            await new Promise((resolve, reject) => {
              exec(
                `gifsicle --lossy=80 -O3 ${tempGif} -o ${compressedGif}`,
                (err) => (err ? reject(err) : resolve())
              );
            });

            const buffer = fs.readFileSync(compressedGif);
            const name = `tenor_${index + 1}`;

            const emoji = await btn.guild.emojis.create({
              attachment: buffer,
              name,
            });

            await btn.reply({
              content: `✅ Added as animated emoji: <a:${emoji.name}:${emoji.id}>`,
              ephemeral: true,
            });
          } catch (e) {
            console.error("Error saving emoji:", e);
            await btn.reply({
              content:
                "❌ Failed to save — check bot permissions or file too large (>256 KB).",
              ephemeral: true,
            });
          } finally {
            // Cleanup
            [tempGif, compressedGif].forEach((f) => fs.existsSync(f) && fs.unlinkSync(f));
          }
        }

        if (["next", "prev"].includes(btn.customId)) {
          await btn.update({ embeds: [getEmbed()], components: [getButtons()] });
        }
      });

      collector.on("end", () => sent.edit({ components: [] }).catch(() => {}));
    } catch (err) {
      console.error("gif2emoji command error:", err);
      const msg = "❌ Failed to fetch or save GIF.";
      if (isPrefix) message.reply(msg).catch(() => {});
      else interaction.editReply(msg).catch(() => {});
    }
  },
};
