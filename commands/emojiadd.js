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
  description: "Search emojis from Emoji.gg and add one to your server",
  data: new SlashCommandBuilder()
    .setName("emojiadd")
    .setDescription("Search and add an emoji from Emoji.gg to your server")
    .addStringOption((option) =>
      option.setName("query").setDescription("Enter emoji search term").setRequired(true)
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
      // Fetch entire emoji list
      const resp = await axios.get("https://emoji.gg/api/");
      const allEmojis = resp.data;

      const results = allEmojis
        .filter((e) => e.title.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 10);

      if (!results.length) {
        const msg = `⚠️ No emojis found for **${query}**`;
        return isPrefix ? message.reply(msg) : interaction.editReply(msg);
      }

      let index = 0;

      // Correct URL constructor
      const getUrl = (emoji) => {
        const file = emoji.url || emoji.image || emoji.filename;
        if (!file) return null;

        return file.startsWith("http")
          ? file
          : `https://cdn3.emoji.gg/emoji/${file.replace(/^\/+/, "")}`;
      };

      const getEmbed = () =>
        new EmbedBuilder()
          .setTitle(`😄 Emoji Search: ${query}`)
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
          return btn.reply({ content: "⛔ That’s not your menu!", ephemeral: true });

        if (btn.customId === "next") index = (index + 1) % results.length;
        else if (btn.customId === "prev") index = (index - 1 + results.length) % results.length;

        // Save emoji
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

            // FIX: Correct permission name
            if (!guild.members.me.permissions.has("ManageGuildExpressions"))
              return btn.followUp("❌ I need **ManageGuildExpressions** permission.");

            // Detect GIF properly
            const isGif = buffer.toString("ascii", 0, 3) === "GIF";

            // Slot checks
            if (isGif) {
              if (
                guild.emojis.cache.filter((e) => e.animated).size >= guild.maximumAnimatedEmojis
              )
                return btn.followUp("❌ Server animated emoji slots are full!");
            } else {
              if (
                guild.emojis.cache.filter((e) => !e.animated).size >= guild.maximumStaticEmojis
              )
                return btn.followUp("❌ Server static emoji slots are full!");
            }

            // Clean name
            const name = (results[index].slug || results[index].title)
              .replace(/[^a-zA-Z0-9_]/g, "_")
              .toLowerCase();

            const emoji = await guild.emojis.create({
              attachment: buffer,
              name,
            });

            await btn.followUp(
              `<a:purple_verified:1439271259190988954> Added emoji: <${emoji.animated ? "a" : ""}:${emoji.name}:${emoji.id}>`
            );
          } catch (e) {
            console.error("Emoji save error:", e);
            return btn.followUp("❌ Failed — CDN blocked or invalid image.");
          }

          return;
        }

        // Update embed on next/prev
        if (!btn.deferred && !btn.replied) await btn.deferUpdate().catch(() => {});
        await btn.editReply({ embeds: [getEmbed()], components: [getButtons()] });
      });

      collector.on("end", () => sent.edit({ components: [] }).catch(() => {}));
    } catch (err) {
      console.error("emojiadd command error:", err);
      const msg = "❌ Failed to fetch or save emoji.";
      isPrefix ? message.reply(msg) : interaction.editReply(msg);
    }
  },
};
