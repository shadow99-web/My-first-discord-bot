const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

module.exports = {
  name: "ask",
  description: "Ask AI anything!",

  options: [
    {
      name: "question",
      type: 3, // STRING
      description: "Your question for AI",
      required: true,
    },
  ],

  async execute({ client, interaction, message, args, isPrefix }) {
    const question = isPrefix ? args.join(" ") : interaction.options.getString("question");
    if (!question) {
      const failMsg = "❌ Please provide a question!";
      return isPrefix ? message.reply(failMsg) : interaction.reply({ content: failMsg, ephemeral: true });
    }

    if (interaction) await interaction.deferReply();

    try {
      const apiKey = process.env.HF_API_KEY;
      if (!apiKey) {
        const failMsg = "⚠️ HuggingFace API key is missing!";
        return isPrefix ? message.reply(failMsg) : interaction.editReply(failMsg);
      }

      let response, data, retries = 0;
      while (retries < 3) { // retry max 3 times if model is cold-starting
        response = await fetch("https://api-inference.huggingface.co/models/distilgpt2", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ inputs: question }),
        });

        if (response.status === 503) {
          retries++;
          if (interaction) await interaction.editReply(`⏳ Warming up model... retrying (${retries}/3)`);
          await new Promise(res => setTimeout(res, 5000)); // wait 5 sec then retry
          continue;
        }

        data = await response.json();
        break;
      }

      if (response.status === 401) {
        const failMsg = "❌ Invalid HuggingFace API key. Please check your `.env`.";
        return isPrefix ? message.reply(failMsg) : interaction.editReply(failMsg);
      }

      if (!data || !Array.isArray(data) || !data[0]?.generated_text) {
        const failMsg = `⚠️ AI API returned invalid response.\nStatus: ${response.status}`;
        return isPrefix ? message.reply(failMsg) : interaction.editReply(failMsg);
      }

      let text = data[0].generated_text;
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
