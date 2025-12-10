const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} = require("discord.js");
const { fetchRyzumiAPI } = require("../utils/ryzumi");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("pin")
    .setDescription("🔍 Search cool images")
    .addStringOption(opt =>
      opt
        .setName("query")
        .setDescription("Search term for images")
        .setRequired(true)
    ),

  name: "pin",
  description: "🔍 Search images (prefix + slash)",

  async execute(context) {
    const { isPrefix, message, interaction, safeReply } = context;

    const query = isPrefix
      ? context.args.join(" ")
      : interaction.options.getString("query");

    const user = isPrefix ? message.author : interaction.user;

    if (!query) {
      return isPrefix
        ? message.reply("❌ Please provide something to search.")
        : safeReply({ content: "❌ Please provide something to search.", ephemeral: true });
    }

    try {
      if (!isPrefix) await interaction.deferReply();

      const data = await fetchRyzumiAPI("/search/pinterest", { query });
      if (!data || !Array.isArray(data) || data.length === 0)
        throw new Error("No results found.");

      let index = 0;

      const makeEmbed = () => {
        const item = data[index];
        return new EmbedBuilder()
          .setColor("#E60023")
          .setTitle(`📍 Images for "${query}"`)
          .setDescription(`[🔗 View Image](${item.link || item.directLink})`)
          .setImage(item.directLink || item.image)
          .setFooter({ text: `Result ${index + 1} of ${data.length}` })
          .setTimestamp();
      };

      const prev = new ButtonBuilder()
        .setCustomId("prev")
        .setLabel("◀ Prev")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true);

      const next = new ButtonBuilder()
        .setCustomId("next")
        .setLabel("Next ▶")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(data.length <= 1);

      const row = new ActionRowBuilder().addComponents(prev, next);

      // ---------------------------
      // FIXED: Uses safeReply
      // ---------------------------

      const replyMsg = isPrefix
        ? await message.reply({ embeds: [makeEmbed()], components: [row] })
        : await interaction.editReply({ embeds: [makeEmbed()], components: [row] });

      const collector = replyMsg.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 150000,
      });

      collector.on("collect", async i => {
        if (i.user.id !== user.id)
          return i.reply({ content: "These buttons aren't for you!", ephemeral: true });

        await i.deferUpdate();

        if (i.customId === "prev") index--;
        if (i.customId === "next") index++;

        prev.setDisabled(index === 0);
        next.setDisabled(index === data.length - 1);

        await replyMsg.edit({
          embeds: [makeEmbed()],
          components: [new ActionRowBuilder().addComponents(prev, next)],
        });
      });

      collector.on("end", async () => {
        const disabled = new ActionRowBuilder().addComponents(
          prev.setDisabled(true),
          next.setDisabled(true)
        );
        await replyMsg.edit({ components: [disabled] }).catch(() => {});
      });

    } catch (err) {
      console.error("❌ Pinterest Fetch Error:", err);

      const msg = "✋TRY AGAIN AFTER 1 min.";

      return isPrefix
        ? message.reply(msg).catch(() => {})
        : safeReply({ content: msg, ephemeral: true });
    }
  },
};
