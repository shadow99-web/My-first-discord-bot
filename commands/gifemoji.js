const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField,
} = require("discord.js");
const fetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args));

const TENOR_API = process.env.TENOR_API_KEY || "YOUR_TENOR_KEY";

module.exports = {
  name: "gifemoji",
  description: "Search Tenor GIFs and add them as emojis!",
  options: [
    {
      name: "search",
      type: 3, // STRING
      description: "Search term (e.g., cat, dance, lol)",
      required: true,
    },
  ],

  async execute({ client, interaction, message, args, isPrefix }) {
    const search = isPrefix ? args.join(" ") : interaction.options.getString("search");
    if (!search)
      return isPrefix
        ? message.reply("❌ Provide a search term!")
        : interaction.reply({ content: "❌ Provide a search term!", ephemeral: true });

    // 🔍 Fetch GIFs from Tenor
    let data;
    try {
      const res = await fetch(
        `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(
          search
        )}&key=${TENOR_API}&limit=10&media_filter=gif`
      );
      data = await res.json();
    } catch (err) {
      console.error("❌ Tenor fetch failed:", err);
      return isPrefix
        ? message.reply("❌ Failed to fetch GIFs.")
        : interaction.reply({ content: "❌ Failed to fetch GIFs.", ephemeral: true });
    }

    if (!data.results?.length)
      return isPrefix
        ? message.reply("❌ No GIFs found!")
        : interaction.reply({ content: "❌ No GIFs found!", ephemeral: true });

    let index = 0;
    const results = data.results;

    const makeEmbed = () =>
      new EmbedBuilder()
        .setColor("Blue")
        .setTitle(`Result ${index + 1}/${results.length}`)
        .setImage(results[index].media_formats.gif.url)
        .setFooter({ text: "◀️ Previous | Next ▶️ | ✅ Add as emoji" });

    const replyTarget = isPrefix ? message : interaction;
    const msg = await replyTarget.reply({
      embeds: [makeEmbed()],
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("prev").setLabel("◀️").setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId("next").setLabel("▶️").setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId("add").setLabel("✅ Add").setStyle(ButtonStyle.Success)
        ),
      ],
    });

    const collector = msg.createMessageComponentCollector({ time: 180000 });

    collector.on("collect", async (btn) => {
      const userId = isPrefix ? message.author.id : interaction.user.id;
      if (btn.user.id !== userId) {
        return btn.reply({ content: "❌ This is not your session!", ephemeral: true });
      }

      if (btn.customId === "prev") {
        index = (index - 1 + results.length) % results.length;
        return btn.update({ embeds: [makeEmbed()] });
      }

      if (btn.customId === "next") {
        index = (index + 1) % results.length;
        return btn.update({ embeds: [makeEmbed()] });
      }

      if (btn.customId === "add") {
        if (!btn.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageEmojisAndStickers)) {
          return btn.reply({
            content: "❌ I need **Manage Emojis & Stickers** permission.",
            ephemeral: true,
          });
        }

        const url = results[index].media_formats.gif.url;
        const name = search.replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase();

        try {
          const emoji = await btn.guild.emojis.create({ attachment: url, name });
          await btn.reply({ content: `✅ Emoji added: <:${emoji.name}:${emoji.id}>` });
        } catch (err) {
          console.error("❌ Emoji creation failed:", err);
          await btn.reply({
            content: "❌ Failed to add emoji (too large or server full).",
            ephemeral: true,
          });
        }
      }
    });

    collector.on("end", async () => {
      try {
        await msg.edit({ components: [] });
      } catch {}
    });
  },
};
