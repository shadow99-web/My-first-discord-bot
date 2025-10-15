const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const axios = require("axios");
const cheerio = require("cheerio");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("pin")
    .setDescription("Fetch Pinterest images by topic")
    .addStringOption(opt =>
      opt
        .setName("query")
        .setDescription("Search topic")
        .setRequired(true)
    ),

  name: "pin",
  aliases: ["pinterest", "pinimg", "pimg"],

  async execute(context) {
    const interaction = context.interaction;
    const message = context.message;

    // ✅ Get query for both prefix and slash
    const query = context.isPrefix
      ? context.args.join(" ")
      : interaction.options.getString("query");

    if (!query) {
      const msg = "❌ Please provide a topic to search!";
      return context.isPrefix ? message.reply(msg) : interaction.reply(msg);
    }

    if (!context.isPrefix) await interaction.deferReply();

    const apiKey = process.env.SCRAPE_CREATORS_API_KEY;
    let items = [];

    try {
      // ✅ 1️⃣ Try ScrapeCreators API
      const { data } = await axios.get(
        `https://api.scrapecreators.com/v1/pinterest/search?query=${encodeURIComponent(query)}&type=image`,
        {
          headers: { "x-api-key": apiKey },
          timeout: 15000,
        }
      );

      if (data?.pins?.length) {
        items = data.pins
          .map(pin => pin.images?.orig?.url || pin.images?.["564x"]?.url)
          .filter(Boolean)
          .slice(0, 15);
      }
    } catch (apiErr) {
      console.warn("⚠️ ScrapeCreators API failed:", apiErr.message);
    }

    // ✅ 2️⃣ Fallback Scraper (Free HTML)
    if (!items.length) {
      try {
        const pinterestURL = `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(query)}`;
        const proxyURL = `https://r.jina.ai/${pinterestURL}`;
        const { data } = await axios.get(proxyURL, {
          headers: {
            "User-Agent": "Mozilla/5.0",
            "Accept": "text/html",
          },
        });

        const $ = cheerio.load(data);
        const seen = new Set();
        $("img").each((_, el) => {
          let src = $(el).attr("src") || $(el).attr("data-src");
          if (src && src.startsWith("https") && !src.includes("blank.gif")) {
            src = src.split(" ")[0];
            seen.add(src);
          }
        });
        items = Array.from(seen).slice(0, 15);
      } catch (err) {
        console.error("Fallback scraping failed:", err.message);
      }
    }

    // ✅ 3️⃣ No results
    if (!items.length) {
      const msg = `⚠️ No results found for **${query}**.`;
      return context.isPrefix ? message.reply(msg) : interaction.editReply(msg);
    }

    // ✅ 4️⃣ Pagination
    let index = 0;
    const getEmbed = () =>
      new EmbedBuilder()
        .setColor("#E60023")
        .setTitle(`♥𝚂𝙷𝙰𝙳𝙾𝚆 𝙸𝙼𝙰𝙶𝙴𝚂: ${query}`)
        .setImage(items[index])
        .setFooter({ text: `Result ${index + 1}/${items.length}` });

    const getButtons = () =>
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("prev").setLabel("◀️").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("next").setLabel("▶️").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setLabel("Download").setStyle(ButtonStyle.Link).setURL(items[index])
      );

    // ✅ Send first embed
    let msg;
    if (context.isPrefix) {
      msg = await message.reply({ embeds: [getEmbed()], components: [getButtons()] });
    } else {
      msg = await interaction.editReply({ embeds: [getEmbed()], components: [getButtons()] });
    }

    const userId = context.isPrefix ? message.author.id : interaction.user.id;
    const collector = msg.createMessageComponentCollector({ time: 60_000 });

    collector.on("collect", async btn => {
      if (btn.user.id !== userId)
        return btn.reply({ content: "⛔ This interaction isn’t for you!", ephemeral: true });

      if (btn.customId === "prev") index = (index - 1 + items.length) % items.length;
      if (btn.customId === "next") index = (index + 1) % items.length;

      await btn.update({ embeds: [getEmbed()], components: [getButtons()] });
    });

    collector.on("end", async () => {
      await msg.edit({ components: [] }).catch(() => {});
    });
  },
};
