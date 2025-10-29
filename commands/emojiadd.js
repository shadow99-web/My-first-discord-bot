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
      option
        .setName("query")
        .setDescription("Enter the emoji search term")
        .setRequired(true)
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
      // 🧠 Fetch from Emoji.gg public API
      const resp = await axios.get("https://emoji.gg/api/");
      const allEmojis = resp.data;

      // 🔍 Filter by query
      const results = allEmojis
        .filter((e) => e.title.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 10);

      if (!results.length)
        return isPrefix
          ? message.reply(`⚠️ No emojis found for **${query}**`)
          : interaction.editReply(`⚠️ No emojis found for **${query}**`);

      let index = 0;

      // 🎨 Embed
      const getEmbed = () =>
        new EmbedBuilder()
          .setTitle(`😄 Emoji Search: ${query}`)
          .setImage(results[index].url)
          .setFooter({ text: `Result ${index + 1}/${results.length}` })
          .setColor("Blurple");

      // 🔘 Buttons
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

        // 💾 Save emoji
        else if (btn.customId === "save_emoji") {
          await btn.deferReply({ ephemeral: true }).catch(() => {});
          try {
            const response = await axios.get(results[index].url, { responseType: "arraybuffer" });
            const buffer = Buffer.from(response.data);
            const name = results[index].slug || `emoji_${index + 1}`;

            const emoji = await btn.guild.emojis.create({
              attachment: buffer,
              name,
            });

            await btn.followUp({
              content: `✅ Added emoji: <${emoji.animated ? "a" : ""}:${emoji.name}:${emoji.id}>`,
            });
          } catch (e) {
            console.error("Error saving emoji:", e);
            await btn.followUp({
              content: "❌ Failed to save — check bot permissions or emoji slot limits.",
            });
          }
          return;
        }

        // 🖼️ Update embed safely
        if (["next", "prev"].includes(btn.customId)) {
          if (!btn.deferred && !btn.replied)
            await btn.deferUpdate().catch(() => {});
          await btn.editReply({ embeds: [getEmbed()], components: [getButtons()] });
        }
      });

      collector.on("end", () => sent.edit({ components: [] }).catch(() => {}));
    } catch (err) {
      console.error("emojiadd command error:", err);
      const msg = "❌ Failed to fetch or save emoji.";
      if (isPrefix) message.reply(msg).catch(() => {});
      else interaction.editReply(msg).catch(() => {});
    }
  },
};
