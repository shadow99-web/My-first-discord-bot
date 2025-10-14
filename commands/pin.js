const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const axios = require("axios");
const cheerio = require("cheerio");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("pin")
    .setDescription("Fetch Pinterest images or clips by topic")
    .addSubcommand(sub =>
      sub
        .setName("images")
        .setDescription("Fetch Pinterest images by topic")
        .addStringOption(opt =>
          opt.setName("query").setDescription("Search topic").setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName("clips")
        .setDescription("Fetch Pinterest clips by topic")
        .addStringOption(opt =>
          opt.setName("query").setDescription("Search topic").setRequired(true)
        )
    ),

  async execute({ client, interaction, safeReply }) {
    if (!interaction.isChatInputCommand())
      return safeReply({ content: "⚠️ Invalid interaction.", ephemeral: true });

    const sub = interaction.options.getSubcommand();
    const query = interaction.options.getString("query");
    await interaction.deferReply();

    try {
      // Pinterest Search URL
      const url = `https://www.pinterest.com/search/${sub === "clips" ? "videos" : "pins"}/?q=${encodeURIComponent(query)}`;
      const { data } = await axios.get(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
          "Accept-Language": "en-US,en;q=0.9",
        },
      });

      // Parse HTML
      const $ = cheerio.load(data);
      const results = new Set();

      $("img").each((_, el) => {
        const src = $(el).attr("src");
        if (src && src.startsWith("https") && !src.includes("blank.gif")) results.add(src);
      });

      const items = Array.from(results).slice(0, 15);

      if (!items.length)
        return interaction.editReply({ content: "⚠️ No Pinterest results found for that topic." });

      // Pagination
      let index = 0;

      const getEmbed = () =>
        new EmbedBuilder()
          .setColor("#E60023")
          .setTitle(`📌 Pinterest ${sub === "clips" ? "Clips" : "Images"}: ${query}`)
          .setImage(items[index])
          .setFooter({ text: `Result ${index + 1}/${items.length}` });

      const row = () =>
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("prev").setLabel("◀️").setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId("next").setLabel("▶️").setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setLabel("Download").setStyle(ButtonStyle.Link).setURL(items[index])
        );

      const msg = await interaction.editReply({ embeds: [getEmbed()], components: [row()] });
      const collector = msg.createMessageComponentCollector({ time: 60_000 });

      collector.on("collect", async (btn) => {
        if (btn.user.id !== interaction.user.id)
          return btn.reply({ content: "⛔ Not your interaction!", ephemeral: true });

        if (btn.customId === "prev") index = (index - 1 + items.length) % items.length;
        if (btn.customId === "next") index = (index + 1) % items.length;

        await btn.update({ embeds: [getEmbed()], components: [row()] });
      });

      collector.on("end", async () => {
        await msg.edit({ components: [] }).catch(() => {});
      });
    } catch (err) {
      console.error("Pinterest Fetch Error:", err.message);
      await safeReply({ content: "❌ Failed to fetch Pinterest data.", ephemeral: true });
    }
  },
};
