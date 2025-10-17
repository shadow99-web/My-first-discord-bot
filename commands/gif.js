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

      if (!tenorKey || !tenorClientKey) {
        const msg = "❌ Missing Tenor API key(s).";
        return isPrefix ? message.reply(msg) : interaction.editReply(msg);
      }

      const limit = 10;
      const url = `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(query)}&key=${tenorKey}&client_key=${tenorClientKey}&limit=${limit}&media_filter=gif`;

      const resp = await axios.get(url);
      const results = resp.data.results;

      if (!results || results.length === 0) {
        const msg = `⚠️ No GIFs found for **${query}**`;
        return isPrefix ? message.reply(msg) : interaction.editReply(msg);
      }

      let index = 0;

      const getEmbed = () => {
        const media = results[index].media_formats?.gif?.url;
        return new EmbedBuilder()
          .setTitle(`🐼 Gif Result: ${query}`)
          .setImage(media)
          .setFooter({ text: `Result ${index + 1}/${results.length} | Powered by Tenor` })
          .setColor("Aqua");
      };

      const getButtons = () =>
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("prev").setLabel("◀️").setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId("next").setLabel("▶️").setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId("saveEmoji").setLabel("🧩 Save as Emoji").setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId("saveSticker").setLabel("💖 Save as Sticker").setStyle(ButtonStyle.Primary)
        );

      const replyOptions = {
        embeds: [getEmbed()],
        components: [getButtons()],
        fetchReply: true,
      };

      const sent = isPrefix
        ? await message.reply(replyOptions)
        : await interaction.editReply(replyOptions);

      const collector = sent.createMessageComponentCollector({ time: 90_000 });

      collector.on("collect", async (btn) => {
        const authorId = isPrefix ? message.author.id : interaction.user.id;
        if (btn.user.id !== authorId)
          return btn.reply({ content: "⛔ That button isn't for you!", ephemeral: true });

        const media = results[index].media_formats?.gif?.url;

        // Navigation buttons
        if (btn.customId === "next") {
          index = (index + 1) % results.length;
          return btn.update({ embeds: [getEmbed()], components: [getButtons()] });
        } else if (btn.customId === "prev") {
          index = (index - 1 + results.length) % results.length;
          return btn.update({ embeds: [getEmbed()], components: [getButtons()] });
        }

        // Save as emoji
        else if (btn.customId === "saveEmoji") {
          try {
            const name = `gif_${Date.now()}`;
            const res = await axios.get(media, { responseType: "arraybuffer" });
            const emoji = await btn.guild.emojis.create({
              attachment: Buffer.from(res.data),
              name,
            });
            await btn.reply({ content: `✅ Added emoji: <${emoji.animated ? "a" : ""}:${emoji.name}:${emoji.id}>`, ephemeral: true });
          } catch (err) {
            console.error(err);
            btn.reply({ content: "❌ Failed to save as emoji (might be full or missing perms).", ephemeral: true });
          }
        }

        // Save as sticker
        else if (btn.customId === "saveSticker") {
          try {
            const res = await axios.get(media, { responseType: "arraybuffer" });
            const filePath = path.join(__dirname, "temp.gif");
            fs.writeFileSync(filePath, res.data);
            await btn.guild.stickers.create({
              file: filePath,
              name: `sticker_${Date.now()}`,
              tags: "fun",
              description: "Created from GIF command",
            });
            fs.unlinkSync(filePath);
            await btn.reply({ content: "💖 Sticker added successfully!", ephemeral: true });
          } catch (err) {
            console.error(err);
            btn.reply({ content: "❌ Failed to save as sticker (missing Manage Stickers or invalid file).", ephemeral: true });
          }
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
