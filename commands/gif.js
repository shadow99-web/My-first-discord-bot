const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const axios = require("axios");

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
      if (!tenorKey) {
        const msg = "❌ TENOR_API_KEY not set in environment.";
        return isPrefix ? message.reply(msg) : interaction.editReply(msg);
      }

      const limit = 10;
      const url = `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(
        query
      )}&key=${tenorKey}&limit=${limit}&media_filter=gif`;

      const resp = await axios.get(url);
      const results = resp.data.results;

      if (!results || results.length === 0) {
        const msg = `⚠️ No GIFs found for **${query}**.`;
        return isPrefix ? message.reply(msg) : interaction.editReply(msg);
      }

      let index = 0;

      const getEmbed = () => {
        const gifUrl =
          results[index]?.media_formats?.gif?.url ||
          results[index]?.media_formats?.mediumgif?.url ||
          results[index]?.url;

        return new EmbedBuilder()
          .setTitle(`🎞️ GIF result for: ${query}`)
          .setImage(gifUrl)
          .setColor("Aqua")
          .setFooter({
            text: `Result ${index + 1}/${results.length}`,
          });
      };

      const getButtons = () =>
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("prev")
            .setLabel("◀️")
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId("next")
            .setLabel("▶️")
            .setStyle(ButtonStyle.Secondary)
        );

      const sent = isPrefix
        ? await message.reply({
            embeds: [getEmbed()],
            components: [getButtons()],
          })
        : await interaction.editReply({
            embeds: [getEmbed()],
            components: [getButtons()],
          });

      const collector = sent.createMessageComponentCollector({ time: 60_000 });

      collector.on("collect", async (btn) => {
        if (
          btn.user.id !== (isPrefix ? message.author.id : interaction.user.id)
        ) {
          return btn.reply({
            content: "⛔ That button isn't for you!",
            ephemeral: true,
          });
        }

        if (btn.customId === "next") {
          index = (index + 1) % results.length;
        } else if (btn.customId === "prev") {
          index = (index - 1 + results.length) % results.length;
        }

        await btn.update({
          embeds: [getEmbed()],
          components: [getButtons()],
        });
      });

      collector.on("end", () => {
        sent.edit({ components: [] }).catch(() => {});
      });
    } catch (err) {
      console.error("❌ gif command error:", err.response?.data || err);
      const msg = "❌ Failed to fetch GIFs. Please try again later.";
      if (isPrefix) message.reply(msg).catch(() => {});
      else interaction.editReply(msg).catch(() => {});
    }
  },
};
