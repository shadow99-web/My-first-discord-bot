const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

module.exports = {
  name: "ask",
  description: "Ask AI anything!",
  options: [
    {
      name: "question",
      type: 3,
      description: "Your question for AI",
      required: true,
    },
  ],

  async execute({ client, interaction, message, args, isPrefix }) {
    const question = isPrefix ? args.join(" ") : interaction.options.getString("question");
    if (!question) {
      const msg = "❌ Please provide a question!";
      return isPrefix ? message.reply(msg) : interaction.reply({ content: msg, ephemeral: true });
    }

    if (interaction) await interaction.deferReply();

    try {
      // ✅ Free, Render-friendly API (no key needed)
      const res = await fetch(`https://api.popcat.xyz/chatbot?msg=${encodeURIComponent(question)}`);
      const data = await res.json();

      if (!data || !data.reply) {
        const failMsg = "⚠️ AI didn't return a valid response.";
        return isPrefix ? message.reply(failMsg) : interaction.editReply(failMsg);
      }

      const text = data.reply;
      const chunks = text.match(/[\s\S]{1,1900}/g) || ["(empty response)"];
      let page = 0;

      const makeEmbed = () =>
        new EmbedBuilder()
          .setTitle("🤖 AI Response")
          .setDescription(chunks[page])
          .setFooter({ text: `Page ${page + 1} / ${chunks.length}` })
          .setColor("Random");

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

      const sent = isPrefix
        ? await message.reply({ embeds: [makeEmbed()], components: [makeRow()] })
        : await interaction.editReply({ embeds: [makeEmbed()], components: [makeRow()] });

      const collector = sent.createMessageComponentCollector({ time: 60000 });

      collector.on("collect", async (i) => {
        const authorId = isPrefix ? message.author.id : interaction.user.id;
        if (i.user.id !== authorId)
          return i.reply({ content: "❌ Only you can use these buttons!", ephemeral: true });

        if (i.customId === "next" && page < chunks.length - 1) page++;
        if (i.customId === "prev" && page > 0) page--;

        await i.update({ embeds: [makeEmbed()], components: [makeRow()] });
      });

      collector.on("end", () => {
        sent.edit({ components: [] }).catch(() => {});
      });
    } catch (err) {
      console.error("AI ERROR:", err);
      const failMsg = "⚠️ Failed to connect to AI API.";
      return isPrefix ? message.reply(failMsg) : interaction.editReply(failMsg);
    }
  },
};
