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
  description: "Search emojis and add one to your server",
  data: new SlashCommandBuilder()
    .setName("emojiadd")
    .setDescription("Search and add an emoji to your server")
    .addStringOption((option) =>
      option.setName("query").setDescription("Emoji search term").setRequired(true)
    ),

  async execute({ client, interaction, message, args, isPrefix }) {
    let query;

    if (isPrefix) {
      if (!args.length) return message.reply("⚠️ Usage: `!emojiadd <search term>`");
      query = args.join(" ");
    } else {
      query = interaction.options.getString("query");
      await interaction.deferReply();
    }

    try {
      // --- Fetch from working API ---
      const resp = await axios.get(`https://discordemoji.com/api?search=${encodeURIComponent(query)}`);
      const results = resp.data.slice(0, 10);

      if (!results.length) {
        const msg = `⚠️ No emojis found for **${query}**`;
        return isPrefix ? message.reply(msg) : interaction.editReply(msg);
      }

      let index = 0;

      // --- Build CDN URL ---
      const getUrl = (emoji) => {
        // If API provides direct URL
        if (emoji.image.startsWith("http")) return emoji.image;

        // Fallback to discordemoji CDN
        return `https://discordemoji.com/assets/emoji/${emoji.image}`;
      };

      const getEmbed = () =>
        new EmbedBuilder()
          .setTitle(`😀 Emoji Search: ${query}`)
          .setImage(getUrl(results[index]))
          .setColor("Blurple")
          .setFooter({ text: `Result ${index + 1}/${results.length}` });

      const getButtons = () =>
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("prev").setLabel("◀️").setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId("next").setLabel("▶️").setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId("save_emoji")
            .setLabel("💾 Add Emoji")
            .setStyle(ButtonStyle.Success)
        );

      const sent = isPrefix
        ? await message.reply({ embeds: [getEmbed()], components: [getButtons()] })
        : await interaction.editReply({ embeds: [getEmbed()], components: [getButtons()] });

      const collector = sent.createMessageComponentCollector({ time: 60_000 });

      collector.on("collect", async (btn) => {
        const userId = isPrefix ? message.author.id : interaction.user.id;

        if (btn.user.id !== userId)
          return btn.reply({ content: "⛔ Not your menu!", ephemeral: true });

        if (btn.customId === "next") index = (index + 1) % results.length;
        else if (btn.customId === "prev") index = (index - 1 + results.length) % results.length;

        // --- Save Emoji ---
        else if (btn.customId === "save_emoji") {
          await btn.deferReply({ ephemeral: true }).catch(() => {});

          try {
            const emojiUrl = getUrl(results[index]);

            const response = await axios.get(emojiUrl, {
              responseType: "arraybuffer",
              headers: { "User-Agent": "Mozilla/5.0 DiscordBot" },
            });

            const buffer = Buffer.from(response.data);
            const guild = btn.guild;

            if (!guild.members.me.permissions.has("ManageGuildExpressions"))
              return btn.followUp("❌ I need **Manage Guild Expressions** permission.");

            const isGif = buffer.toString("ascii", 0, 3) === "GIF";

            if (isGif) {
              if (guild.emojis.cache.filter((e) => e.animated).size >= guild.maximumAnimatedEmojis)
                return btn.followUp("❌ Animated emoji slots are full!");
            } else {
              if (guild.emojis.cache.filter((e) => !e.animated).size >= guild.maximumStaticEmojis)
                return btn.followUp("❌ Static emoji slots are full!");
            }

            const name = results[index].title.replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase();

            const emoji = await guild.emojis.create({ attachment: buffer, name });

            await btn.followUp(
              `<a:purple_verified:1439271259190988954> Added emoji: <${emoji.animated ? "a" : ""}:${emoji.name}:${emoji.id}>`
            );
          } catch (err) {
            console.error(err);
            return btn.followUp("❌ Failed — image blocked or invalid.");
          }

          return;
        }

        if (!btn.deferred && !btn.replied) await btn.deferUpdate().catch(() => {});
        await btn.editReply({ embeds: [getEmbed()], components: [getButtons()] });
      });

      collector.on("end", () => sent.edit({ components: [] }).catch(() => {}));
    } catch (err) {
      console.error("emojiadd command error:", err);
      const msg = "❌ Failed to fetch or save emoji.";
      return isPrefix ? message.reply(msg) : interaction.editReply(msg);
    }
  },
};
