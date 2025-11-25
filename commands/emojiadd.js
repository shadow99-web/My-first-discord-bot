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
      const resp = await axios.get("https://emoji.gg/api/");
      const allEmojis = resp.data;

      // Filter emojis by query
      const results = allEmojis
        .filter((e) => e.title.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 10);

      if (!results.length)
        return isPrefix
          ? message.reply(`⚠️ No emojis found for **${query}**`)
          : interaction.editReply(`⚠️ No emojis found for **${query}**`);

      let index = 0;

      // Helper: get full image URL
     const getUrl = (emoji) => {
  // Emoji.gg raw image location
  const file = emoji.url || emoji.image || emoji.filename;
  if (!file) return null;

  // Fix: emoji.gg sometimes returns relative paths
  const clean = file.startsWith("http")
    ? file
    : `https://cdn3.emoji.gg/emoji/${file.replace(/^\/+/, "")}`;

  return clean;
};

      // Embed builder
      const getEmbed = () =>
        new EmbedBuilder()
          .setTitle(`😄 Emoji Search: ${query}`)
          .setImage(getUrl(results[index]))
          .setFooter({ text: `Result ${index + 1}/${results.length}` })
          .setColor("Blurple");

      // Buttons
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

    // 🔥 FIX: Some emoji.gg URLs give 403. Force user-agent header.
    const response = await axios.get(emojiUrl, {
      responseType: "arraybuffer",
      headers: {
        "User-Agent": "Mozilla/5.0 DiscordBot",
        "Accept": "image/*",
      },
    });

    const buffer = Buffer.from(response.data);
    const guild = btn.guild;

    // ⚠️ Check bot permission
    if (!guild.members.me.permissions.has("ManageExpressions")) {
      return btn.followUp("❌ I need **Manage Expressions** permission.");
    }

    // ⚠️ Check emoji slot capacity
    const totalEmojis = guild.emojis.cache.size;
    const maxStatic = guild.maximumStaticEmojis;
    const maxAnimated = guild.maximumAnimatedEmojis;

    if (buffer[0] === 0x47 /* GIF header: "GIF" */) {
      if (guild.emojis.cache.filter(e => e.animated).size >= maxAnimated)
        return btn.followUp("❌ Server animated emoji slots are full!");
    } else {
      if (guild.emojis.cache.filter(e => !e.animated).size >= maxStatic)
        return btn.followUp("❌ Server static emoji slots are full!");
    }

    const name =
      results[index].slug ||
      results[index].title.replace(/\s+/g, "_").toLowerCase();

    const emoji = await guild.emojis.create({
      attachment: buffer,
      name,
    });

    await btn.followUp({
      content: `<a:purple_verified:1439271259190988954> Added emoji: <${emoji.animated ? "a" : ""}:${emoji.name}:${emoji.id}>`,
    });

  } catch (e) {
    console.error("Emoji save error:", e);
    await btn.followUp("❌ Failed — CDN blocked or invalid image.");
  }

  return;
        }
        // Update embed safely
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
