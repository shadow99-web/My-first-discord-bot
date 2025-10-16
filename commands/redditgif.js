const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder,
} = require("discord.js");
const axios = require("axios");
const { MessageActionRow, MessageButton } = require("discord.js");

module.exports = {
  name: "redditgif",
  description: "Fetch GIFs from Reddit and optionally add as emoji/sticker",
  data: new SlashCommandBuilder()
    .setName("redditgif")
    .setDescription("Search a GIF on Reddit")
    .addStringOption(opt =>
      opt.setName("query")
        .setDescription("Search term for GIFs")
        .setRequired(true)
    ),

  async execute({ client, interaction, message, args, isPrefix }) {
    let query;
    if (isPrefix) {
      if (!args.length) return message.reply("Usage: `!redditgif <query>`");
      query = args.join(" ");
    } else {
      query = interaction.options.getString("query");
      await interaction.deferReply();
    }

    try {
      const apiKey = process.env.SCRAPE_CREATORS_REDDIT_API_KEY;
      const url = `https://api.scrapecreators.com/v1/reddit/search?query=${encodeURIComponent(query)}&sort=new&trim=true`;
      const resp = await axios.get(url, {
        headers: { "x-api-key": apiKey }
      });
      const data = resp.data;

      if (!data.posts || data.posts.length === 0) {
        const msg = `⚠️ No results found for **${query}**`;
        if (isPrefix) return message.reply(msg);
        else return interaction.editReply(msg);
      }

      // Filter for GIF / image posts
      let gifs = [];
      for (const post of data.posts) {
        // The JSON structure may vary. Suppose post.media contains the GIF url
        if (post.media && post.media.type === "gif" && post.media.url) {
          gifs.push(post.media.url);
        }
        // Or Reddit posts sometimes have `preview`/`url_overridden_by_dest` etc.
        if (post.url && post.url.endsWith(".gif")) {
          gifs.push(post.url);
        }
        if (gifs.length >= 10) break;
      }

      if (gifs.length === 0) {
        const msg = `⚠️ No GIFs found for **${query}**`;
        if (isPrefix) return message.reply(msg);
        else return interaction.editReply(msg);
      }

      let index = 0;
      const getEmbed = () =>
        new EmbedBuilder()
          .setTitle(`🎞 Reddit GIF: ${query}`)
          .setImage(gifs[index])
          .setFooter({ text: `Result ${index + 1}/${gifs.length}` });

      const row = () =>
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("prev").setLabel("◀️").setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId("next").setLabel("▶️").setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId("add_emoji").setLabel("➕ Emoji").setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId("add_sticker").setLabel("🍁 Sticker").setStyle(ButtonStyle.Success)
        );

      const msgSent = isPrefix
        ? await message.reply({ embeds: [getEmbed()], components: [row()] })
        : await interaction.editReply({ embeds: [getEmbed()], components: [row()] });

      const collector = msgSent.createMessageComponentCollector({ time: 60000 });
      collector.on("collect", async btn => {
        if (btn.user.id !== (isPrefix ? message.author.id : interaction.user.id)) {
          return btn.reply({ content: "Not your button", ephemeral: true });
        }

        if (btn.customId === "prev") {
          index = (index - 1 + gifs.length) % gifs.length;
        } else if (btn.customId === "next") {
          index = (index + 1) % gifs.length;
        } else if (btn.customId === "add_emoji") {
          // Add as emoji
          try {
            const guild = isPrefix ? message.guild : interaction.guild;
            const buffer = (await axios.get(gifs[index], { responseType: "arraybuffer" })).data;
            const name = `gif_${Date.now()}`;
            const emoji = await guild.emojis.create(buffer, name);
            await btn.reply({ content: `✅ Emoji added: ${emoji}`, ephemeral: true });
          } catch (err) {
            console.error("Error adding emoji:", err);
            await btn.reply({ content: "❌ Could not add as emoji.", ephemeral: true });
          }
        } else if (btn.customId === "add_sticker") {
          // Add as sticker — must be in guild, you must have MANAGE_EMOJIS_AND_STICKERS permission
          try {
            const guild = isPrefix ? message.guild : interaction.guild;
            const buffer = (await axios.get(gifs[index], { responseType: "arraybuffer" })).data;
            const sticker = await guild.stickers.create(buffer, `sticker${Date.now()}`, "Sticker from GIF");
            await btn.reply({ content: `✅ Sticker added: ${sticker.name}`, ephemeral: true });
          } catch (err) {
            console.error("Error adding sticker:", err);
            await btn.reply({ content: "❌ Could not add as sticker.", ephemeral: true });
          }
        }

        // update embed and buttons for new index (if prev/next)
        await btn.update({ embeds: [getEmbed()], components: [row()] });
      });

      collector.on("end", async () => {
        await msgSent.edit({ components: [] }).catch(() => {});
      });

    } catch (err) {
      console.error("redditgif error:", err);
      const msg = "❌ Failed to fetch Reddit GIF.";
      if (isPrefix) message.reply(msg).catch(() => {});
      else interaction.editReply(msg).catch(() => {});
    }
  },
};
