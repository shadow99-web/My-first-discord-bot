const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ask")
    .setDescription("Ask AI anything!")
    .addStringOption(option =>
      option
        .setName("question")
        .setDescription("Your question for AI")
        .setRequired(true)
    ),

  async execute(context) {
    const { interaction, message, args, isPrefix } = context;
    const question = isPrefix ? args.join(" ") : interaction.options.getString("question");

    if (!question) {
      const msg = "❌ Please provide a question!";
      return isPrefix
        ? await message.reply(msg)
        : await interaction.reply({ content: msg, ephemeral: true });
    }

    try {
      // Fetch AI response
      const res = await fetch(`https://api.popcat.xyz/chatbot?msg=${encodeURIComponent(question)}`);
      const data = await res.json();

      if (!data || !data.reply) {
        const failMsg = "⚠️ AI didn't return a valid response.";
        return isPrefix
          ? await message.reply(failMsg)
          : await interaction.reply({ content: failMsg, ephemeral: true });
      }

      const text = data.reply;
      const chunks = text.match(/[\s\S]{1,1900}/g) || ["(empty response)"];
      let page = 0;

      const makeEmbed = () =>
        new EmbedBuilder()
          .setTitle("🤖 AI Response")
          .setDescription(chunks[page])
          .setFooter({ text: `Page ${page + 1} / ${chunks.length}` })
          .setColor("Random"); // Can also use helper for true random color

      const makeRow = () =>
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("prev")
            .setLabel("⬅️")
            .setStyle(ButtonStyle.Primary)
            .setDisabled(page === 0),
          new ButtonBuilder()
            .setCustomId("next")
            .setLabel("➡️")
            .setStyle(ButtonStyle.Primary)
            .setDisabled(page === chunks.length - 1)
        );

      // Send initial embed
      const sent = isPrefix
        ? await message.reply({ embeds: [makeEmbed()], components: [makeRow()] })
        : await interaction.reply({ embeds: [makeEmbed()], components: [makeRow()], fetchReply: true });

      const replyMsg = isPrefix ? sent : await interaction.fetchReply();

      // Collector for pagination buttons
      const collector = replyMsg.createMessageComponentCollector({ time: 60000 });

      collector.on("collect", async (i) => {
        const authorId = isPrefix ? message.author.id : interaction.user.id;
        if (i.user.id !== authorId)
          return i.reply({ content: "❌ Only you can use these buttons!", ephemeral: true });

        if (i.customId === "next" && page < chunks.length - 1) page++;
        if (i.customId === "prev" && page > 0) page--;

        await i.update({ embeds: [makeEmbed()], components: [makeRow()] });
      });

      collector.on("end", () => {
        replyMsg.edit({ components: [] }).catch(() => {});
      });

    } catch (err) {
      console.error("AI ERROR:", err);
      const failMsg = "⚠️ Failed to connect to AI API.";
      return isPrefix
        ? await message.reply(failMsg)
        : await interaction.reply({ content: failMsg, ephemeral: true });
    }
  },
};
