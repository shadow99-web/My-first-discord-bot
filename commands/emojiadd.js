const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const axios = require("axios");

module.exports = {
  name: "emojiadd",
  description: "Search and add an emoji to your server",
  data: new SlashCommandBuilder()
    .setName("emojiadd")
    .setDescription("Search and add an emoji to your server")
    .addStringOption((option) =>
      option
        .setName("query")
        .setDescription("Enter the emoji search term")
        .setRequired(true)
    ),

  async execute({ client, interaction, message, args, isPrefix }) {
    let query;

    // ==========================
    // 🔍 Find Query
    // ==========================
    if (isPrefix) {
      if (!args.length) return message.reply("⚠️ Usage: `!emojiadd <search term>`");
      query = args.join(" ");
    } else {
      query = interaction.options.getString("query");
      await interaction.deferReply();
    }

    try {
      // ==========================
      // 🌐 Fetch emoji database
      // ==========================
      const resp = await axios.get("https://discordemoji.com/api?request=all");
      const allEmojis = resp.data;

      const results = allEmojis
        .filter((e) => e.title.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 10);

      if (!results.length) {
        const msg = `⚠️ No emojis found for **${query}**`;
        return isPrefix ? message.reply(msg) : interaction.editReply(msg);
      }

      let index = 0;

      // ==========================
      // 🖼 Fix CDN path
      // ==========================
      const getUrl = (emoji) => {
        const file = emoji.image || emoji.url || emoji.filename;
        if (!file) return null;

        return file.startsWith("http")
          ? file
          : `https://discordemoji.com/assets/emoji/${file.replace(/^\/+/, "")}`;
      };

      // ==========================
      // 📌 Embed
      // ==========================
      const getEmbed = () =>
        new EmbedBuilder()
          .setTitle(`😄 Emoji Search: ${query}`)
          .setImage(getUrl(results[index]))
          .setColor("Blurple")
          .setFooter({ text: `Result ${index + 1}/${results.length}` });

      // ==========================
      // 🔘 Buttons
      // ==========================
      const getButtons = () =>
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("prev").setLabel("◀️").setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId("next").setLabel("▶️").setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId("save_emoji")
            .setLabel("💾 Add Emoji")
            .setStyle(ButtonStyle.Success)
        );

      // ==========================
      // 📤 Send Message
      // ==========================
      const sent = isPrefix
        ? await message.reply({ embeds: [getEmbed()], components: [getButtons()] })
        : await interaction.editReply({ embeds: [getEmbed()], components: [getButtons()] });

      const collector = sent.createMessageComponentCollector({ time: 60_000 });

      // ==========================
      // 🎮 Handle Buttons
      // ==========================
      collector.on("collect", async (btn) => {
        const userId = isPrefix ? message.author.id : interaction.user.id;

        if (btn.user.id !== userId)
          return btn.reply({ content: "⛔ That's not your menu!", ephemeral: true });

        // ↔ Navigation
        if (btn.customId === "next") index = (index + 1) % results.length;
        else if (btn.customId === "prev") index = (index - 1 + results.length) % results.length;

        // ==========================
        // 💾 SAVE EMOJI
        // ==========================
        else if (btn.customId === "save_emoji") {
          await btn.deferReply({ ephemeral: true }).catch(() => {});

          try {
            const emojiUrl = getUrl(results[index]);

            // 🚫 NO HEADERS — fixes 403
            const response = await axios.get(emojiUrl, {
              responseType: "arraybuffer",
            });

            const buffer = Buffer.from(response.data);
            const guild = btn.guild;

            // Permission check
            if (!guild.members.me.permissions.has("ManageGuildExpressions"))
              return btn.followUp("❌ I need **Manage Guild Expressions** permission.");

            // Detect GIF
            const isGif = buffer.toString("ascii", 0, 3) === "GIF";

            // Slot checks
            if (isGif) {
              if (guild.emojis.cache.filter((e) => e.animated).size >= guild.maximumAnimatedEmojis)
                return btn.followUp("❌ Server animated emoji slots are full!");
            } else {
              if (guild.emojis.cache.filter((e) => !e.animated).size >= guild.maximumStaticEmojis)
                return btn.followUp("❌ Server static emoji slots are full!");
            }

            // Clean name
            const name = results[index].title.replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase();

            const emoji = await guild.emojis.create({
              attachment: buffer,
              name,
            });

            return btn.followUp(
              `<a:purple_verified:1439271259190988954> Added emoji: <${emoji.animated ? "a" : ""}:${emoji.name}:${emoji.id}>`
            );
          } catch (err) {
            console.error("Emoji save error:", err);
            return btn.followUp("❌ Failed — CDN blocked or file missing.");
          }
        }

        // 🔄 Update embed
        if (!btn.deferred && !btn.replied) await btn.deferUpdate().catch(() => {});
        return btn.editReply({ embeds: [getEmbed()], components: [getButtons()] });
      });

      collector.on("end", () => {
        sent.edit({ components: [] }).catch(() => {});
      });
    } catch (err) {
      console.error("emojiadd command error:", err);
      const msg = "❌ Failed to fetch emoji list.";
      return isPrefix ? message.reply(msg) : interaction.editReply(msg);
    }
  },
};
