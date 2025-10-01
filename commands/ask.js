const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, InteractionResponseFlags } = require("discord.js");

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
      return isPrefix ? message.reply(failMsg) : interaction.reply({ content: failMsg, flags: InteractionResponseFlags.Ephemeral });
    }

    if (interaction) await interaction.deferReply({ flags: InteractionResponseFlags.Ephemeral });

    try {
      const apiKey = process.env.HF_API_KEY;
      if (!apiKey) {
        const failMsg = "⚠️ HuggingFace API key is missing!";
        return isPrefix ? message.reply(failMsg) : interaction.editReply({ content: failMsg });
      }

      let response, data, retries = 0;
      while (retries < 3) {
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
          if (interaction) await interaction.editReply({ content: `⏳ Warming up model... retrying (${retries}/3)` });
          await new Promise(res => setTimeout(res, 5000));
          continue;
        }

        data = await response.json();
        break;
      }

      if (response.status === 401) {
        const failMsg = "❌ Invalid HuggingFace API key. Please check your `.env`.";
        return isPrefix ? message.reply(failMsg) : interaction.editReply({ content: failMsg });
      }

      if (!data || !Array.isArray(data) || !data[0]?.generated_text) {
        const failMsg = `⚠️ AI API returned invalid response.\nStatus: ${response.status}`;
        return isPrefix ? message.reply(failMsg) : interaction.editReply({ content: failMsg });
      }

      let text = data[0].generated_text;
      const chunks = text.match(/[\s\S]{1,1900}/g) || ["(empty response)"];
      let page = 0;

      const makeEmbed = () =>
        new EmbedBuilder()
          .setTitle("🤖 AI Response")
          .setDescription(chunks[page])
          .setFooter({ text: `Page ${page + 1} / ${chunks.length}` })
          .setColor(Math.floor(Math.random() * 16777215));

      const idPrefix = `ai-${interaction ? interaction.id : message.id}`;

      const makeRow = () =>
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`${idPrefix}-prev`)
            .setLabel("⬅️")
            .setStyle(ButtonStyle.Primary)
            .setDisabled(page === 0),
          new ButtonBuilder()
            .setCustomId(`${idPrefix}-next`)
            .setLabel("➡️")
            .setStyle(ButtonStyle.Primary)
            .setDisabled(page === chunks.length - 1)
        );

      const sent = isPrefix
        ? await message.reply({ embeds: [makeEmbed()], components: [makeRow()] })
        : await interaction.editReply({ embeds: [makeEmbed()], components: [makeRow()] });

      const collector = sent.createMessageComponentCollector({ time: 180000 }); // 3 minutes

      collector.on("collect", async (i) => {
        const authorId = isPrefix ? message.author.id : interaction.user.id;
        if (i.user.id !== authorId) {
          return i.reply({ content: "❌ Only the command user can use these buttons!", flags: InteractionResponseFlags.Ephemeral });
        }

        if (i.customId === `${idPrefix}-next` && page < chunks.length - 1) page++;
        if (i.customId === `${idPrefix}-prev` && page > 0) page--;

        await i.update({ embeds: [makeEmbed()], components: [makeRow()] });
      });

      collector.on("end", async () => {
        sent.edit({ components: [] }).catch(() => {});
      });

    } catch (err) {
      console.error("AI ERROR:", err);
      const failMsg = "⚠️ Failed to connect to AI API.";
      return isPrefix ? message.reply(failMsg) : interaction.editReply({ content: failMsg });
    }
  },
};
