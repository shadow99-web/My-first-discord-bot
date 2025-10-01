const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

module.exports = {
  name: "ask",
  description: "Ask AI anything!",

  // For slash commands
  options: [
    {
      name: "question",
      type: 3, // STRING
      description: "Your question for AI",
      required: true,
    },
  ],

  /**
   * Slash + Prefix unified execute
   */
  async execute({ client, interaction, message, args, isPrefix }) {
    const question = isPrefix ? args.join(" ") : interaction.options.getString("question");
    if (!question) {
      if (isPrefix) return message.reply("❌ Please provide a question!");
      return interaction.reply({ content: "❌ Please provide a question!", ephemeral: true });
    }

    if (interaction) await interaction.deferReply();

    try {
      // Call HuggingFace API
      const response = await fetch("https://api-inference.huggingface.co/models/gpt2", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.HF_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ inputs: question }),
      });

      const data = await response.json();
      if (!data || !data[0] || !data[0].generated_text) {
        const failMsg = "⚠️ AI API returned invalid response.";
        return isPrefix ? message.reply(failMsg) : interaction.editReply(failMsg);
      }

      let text = data[0].generated_text;
      const chunks = text.match(/[\s\S]{1,1900}/g) || ["(empty response)"];
      let page = 0;

      const makeEmbed = () =>
        new EmbedBuilder()
          .setTitle("💫 AI Response")
          .setDescription(chunks[page])
          .setFooter({ text: `Page ${page + 1} / ${chunks.length}` })
          .setColor("Random");

      const makeRow = () =>
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("prev").setLabel("⬅️").setStyle(ButtonStyle.Primary).setDisabled(page === 0),
          new ButtonBuilder().setCustomId("next").setLabel("➡️").setStyle(ButtonStyle.Primary).setDisabled(page === chunks.length - 1)
        );

      const sent = isPrefix
        ? await message.reply({ embeds: [makeEmbed()], components: [makeRow()] })
        : await interaction.editReply({ embeds: [makeEmbed()], components: [makeRow()] });

      const collector = sent.createMessageComponentCollector({ time: 60000 });

      collector.on("collect", async (i) => {
        const authorId = isPrefix ? message.author.id : interaction.user.id;
        if (i.user.id !== authorId) {
          return i.reply({ content: "❌ Only the command user can use these buttons!", ephemeral: true });
        }

        if (i.customId === "next" && page < chunks.length - 1) page++;
        if (i.customId === "prev" && page > 0) page--;

        await i.update({ embeds: [makeEmbed()], components: [makeRow()] });
      });

      collector.on("end", async () => {
        sent.edit({ components: [] }).catch(() => {});
      });

    } catch (err) {
      console.error("AI ERROR:", err);
      const failMsg = "⚠️ Failed to connect to AI API.";
      return isPrefix ? message.reply(failMsg) : interaction.editReply(failMsg);
    }
  },
};
