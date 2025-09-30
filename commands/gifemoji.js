const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField,
} = require("discord.js");

const TENOR_API = process.env.TENOR_API_KEY || "YOUR_TENOR_KEY"; // safer than hardcoding

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
        : interaction.reply("❌ Provide a search term!");

    // 🔍 Fetch GIFs from Tenor
    const res = await fetch(
      `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(
        search
      )}&key=${TENOR_API}&limit=10&media_filter=gif`
    );
    const data = await res.json();

    if (!data.results?.length) {
      return isPrefix
        ? message.reply("❌ No results found!")
        : interaction.reply("❌ No results found!");
    }

    let index = 0;
    const results = data.results;

    // 📌 Embed generator
    const makeEmbed = () =>
      new EmbedBuilder()
        .setColor("Blue")
        .setTitle(`Result ${index + 1}/${results.length}`)
        .setImage(results[index].media_formats.gif.url)
        .setFooter({
          text: "◀️ ▶️ to browse | ✅ to add as emoji",
        });

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

    // 🎮 Collector
    const collector = msg.createMessageComponentCollector({ time: 60000 });

    collector.on("collect", async (btn) => {
      if (btn.user.id !== (isPrefix ? message.author.id : interaction.user.id)) {
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
        if (
          !btn.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageEmojisAndStickers)
        ) {
          return btn.reply({
            content: "❌ I don’t have **Manage Emojis & Stickers** permission.",
            ephemeral: true,
          });
        }

        const url = results[index].media_formats.gif.url;
        const name = search.replace(/\s+/g, "_").toLowerCase();

        try {
          const emoji = await btn.guild.emojis.create({ attachment: url, name });
          await btn.reply(`✅ Emoji added: <:${emoji.name}:${emoji.id}>`);
        } catch (e) {
          console.error("❌ Failed to add emoji:", e);
          await btn.reply({
            content: "❌ Failed to add emoji (maybe too large or server slots full).",
            ephemeral: true,
          });
        }
      }
    });
  },
};
