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
const path = require("path");

module.exports = {
  name: "gif",
  description: "Search for a GIF using Tenor",
  data: new SlashCommandBuilder()
    .setName("gif")
    .setDescription("Search for a GIF via Tenor")
    .addStringOption(option =>
      option
        .setName("query")
        .setDescription("What GIF do you want?")
        .setRequired(true)
    ),

  async execute({ client, interaction, message, args, isPrefix }) {
    let query;
    if (isPrefix) {
      if (!args.length) return message.reply("⚠️ Usage: `!gif <search term>`");
      query = args.join(" ");
    } else {
      query = interaction.options.getString("query");
      await interaction.deferReply();
    }

    try {
      const tenorKey = process.env.TENOR_API_KEY;
      const tenorClientKey = process.env.TENOR_CLIENT_KEY;
      if (!tenorKey || !tenorClientKey)
        return (isPrefix
          ? message.reply("❌ Missing TENOR API keys.")
          : interaction.editReply("❌ Missing TENOR API keys."));

      const limit = 10;
      const url = `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(
        query
      )}&key=${tenorKey}&client_key=${tenorClientKey}&limit=${limit}&media_filter=gif`;

      const resp = await axios.get(url);
      const results = resp.data.results;
      if (!results || results.length === 0)
        return (isPrefix
          ? message.reply(`⚠️ No GIFs found for **${query}**`)
          : interaction.editReply(`⚠️ No GIFs found for **${query}**`));

      let index = 0;

      const getEmbed = () =>
        new EmbedBuilder()
          .setTitle(`🐼 GIF result: ${query}`)
          .setImage(results[index].media_formats.gif.url)
          .setFooter({ text: `Result ${index + 1}/${results.length}` })
          .setColor("Aqua");

      const getButtons = () =>
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("prev")
            .setLabel("◀️")
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId("next")
            .setLabel("▶️")
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId("save_emoji")
            .setLabel("💾 Save as Emoji")
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId("save_sticker")
            .setLabel("❤️ Save as Sticker")
            .setStyle(ButtonStyle.Primary)
        );

      const sent = isPrefix
        ? await message.reply({ embeds: [getEmbed()], components: [getButtons()] })
        : await interaction.editReply({ embeds: [getEmbed()], components: [getButtons()] });

      const collector = sent.createMessageComponentCollector({ time: 60_000 });

      collector.on("collect", async (btn) => {
        const userId = isPrefix ? message.author.id : interaction.user.id;
        if (btn.user.id !== userId)
          return btn.reply({ content: "⛔ That button isn’t for you!", ephemeral: true });

        const currentGif = results[index].media_formats.gif.url;

        // 🔁 Navigation
        if (btn.customId === "next") index = (index + 1) % results.length;
        else if (btn.customId === "prev") index = (index - 1 + results.length) % results.length;

        // 💾 Convert GIF to PNG for emoji/sticker
        else if (["save_emoji", "save_sticker"].includes(btn.customId)) {
          try {
            const tempGif = path.join(__dirname, `temp_${Date.now()}.gif`);
            const tempPng = path.join(__dirname, `temp_${Date.now()}.png`);

            // Download GIF
            const response = await axios.get(currentGif, { responseType: "arraybuffer" });
            fs.writeFileSync(tempGif, Buffer.from(response.data, "binary"));

            // Convert to PNG (first frame only)
            await sharp(tempGif, { pages: 1 }).png().toFile(tempPng);

            const buffer = fs.readFileSync(tempPng);
            const name = `tenor_${index + 1}`;

            if (btn.customId === "save_emoji") {
              const emoji = await btn.guild.emojis.create({ attachment: buffer, name });
              await btn.reply({
                content: `✅ Saved as emoji: <:${emoji.name}:${emoji.id}>`,
                ephemeral: true,
              });
            } else {
              await btn.guild.stickers.create({
                file: buffer,
                name,
                tags: "fun",
                description: `Sticker from Tenor by ${btn.user.username}`,
              });
              await btn.reply({
                content: `✅ Saved as sticker **${name}**`,
                ephemeral: true,
              });
            }

            // Cleanup
            fs.unlinkSync(tempGif);
            fs.unlinkSync(tempPng);
          } catch (e) {
            console.error(e);
            return btn.reply({
              content: "❌ Failed to save — check bot permissions or file limits.",
              ephemeral: true,
            });
          }
        }

        // 🔄 Update embed
        if (["next", "prev"].includes(btn.customId)) {
          await btn.update({ embeds: [getEmbed()], components: [getButtons()] });
        }
      });

      collector.on("end", () => sent.edit({ components: [] }).catch(() => {}));
    } catch (err) {
      console.error("gif command error:", err);
      const msg = "❌ Failed to fetch GIF. Try again later.";
      if (isPrefix) message.reply(msg).catch(() => {});
      else interaction.editReply(msg).catch(() => {});
    }
  },
};
