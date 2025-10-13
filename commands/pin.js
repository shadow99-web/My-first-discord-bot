const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const axios = require("axios");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("pin")
    .setDescription("Search Pinterest for images or clips.")
    .addSubcommand((sub) =>
      sub
        .setName("images")
        .setDescription("Search Pinterest for images")
        .addStringOption((opt) =>
          opt.setName("query").setDescription("Topic to search").setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("clips")
        .setDescription("Search Pinterest for clips")
        .addStringOption((opt) =>
          opt.setName("query").setDescription("Topic to search").setRequired(true)
        )
    ),

  name: "pin",
  description: "Search Pinterest for images or clips (prefix + slash).",
  usage: "pin <images|clips> <topic>",

  async execute({ client, interaction, message, args, isPrefix }) {
    let sub, query;

    // --- Handle Slash Command ---
    if (!isPrefix) {
      sub = interaction.options.getSubcommand();
      query = interaction.options.getString("query");
      await interaction.deferReply();
    }

    // --- Handle Prefix Command ---
    else {
      if (!args.length) {
        return message.reply(
          "❌ Usage: `pin <images|clips> <topic>`"
        );
      }
      sub = args.shift().toLowerCase();
      query = args.join(" ");
      if (!["images", "clips"].includes(sub))
        return message.reply("❌ Subcommand must be `images` or `clips`.");
      await message.channel.sendTyping();
    }

    try {
      const type = sub === "clips" ? "videos" : "pins";
      const url = `https://www.pinterest.com/resource/BaseSearchResource/get/?source_url=/${encodeURIComponent(
        query
      )}/${type}/`;

      const response = await axios.get(url, {
        headers: { "User-Agent": "Mozilla/5.0" },
      });

      const data = response.data?.resource_response?.data?.results || [];
      if (!data.length)
        return (isPrefix
          ? message.reply("❌ No results found for that query.")
          : interaction.editReply("❌ No results found for that query."));

      const items = data.slice(0, 15).map((pin) => ({
        title: pin.title || "Untitled",
        image: pin.images?.orig?.url || pin.images?.["474x"]?.url,
        link: `https://www.pinterest.com/pin/${pin.id}/`,
      }));

      // Pagination setup
      let page = 0;

      const getEmbed = (i) =>
        new EmbedBuilder()
          .setColor("Red")
          .setTitle(items[i].title)
          .setImage(items[i].image)
          .setURL(items[i].link)
          .setFooter({ text: `Result ${i + 1} of ${items.length}` });

      const buttons = (i) =>
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("prev")
            .setLabel("⬅️ Prev")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(i === 0),
          new ButtonBuilder()
            .setCustomId("next")
            .setLabel("Next ➡️")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(i === items.length - 1),
          new ButtonBuilder()
            .setLabel("Download")
            .setStyle(ButtonStyle.Link)
            .setURL(items[i].image)
        );

      // Send message (slash or prefix)
      const sent = isPrefix
        ? await message.channel.send({
            embeds: [getEmbed(page)],
            components: [buttons(page)],
          })
        : await interaction.editReply({
            embeds: [getEmbed(page)],
            components: [buttons(page)],
          });

      const collector = sent.createMessageComponentCollector({ time: 60000 });

      collector.on("collect", async (btnInt) => {
        const user = isPrefix ? message.author : interaction.user;
        if (btnInt.user.id !== user.id)
          return btnInt.reply({
            content: "This is not your session!",
            ephemeral: true,
          });

        if (btnInt.customId === "next" && page < items.length - 1) page++;
        else if (btnInt.customId === "prev" && page > 0) page--;

        await btnInt.update({
          embeds: [getEmbed(page)],
          components: [buttons(page)],
        });
      });

      collector.on("end", async () => {
        sent.edit({ components: [] }).catch(() => {});
      });
    } catch (err) {
      console.error("🤞🏻 Pinterest Fetch Error:", err);
      if (isPrefix)
        message.reply("❤‍🩹 Failed to fetch  results. Try again later.");
      else interaction.editReply("❤‍🩹 Failed to fetch  results. Try again later.");
    }
  },
};
