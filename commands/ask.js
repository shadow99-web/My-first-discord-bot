const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

module.exports = {
  name: "ask",
  description: "Ask AI anything (uses public APIs fallback system).",
  options: [
    {
      name: "question",
      type: 3, // STRING
      description: "Ask your question to the AI",
      required: true,
    },
  ],

  async execute({ client, interaction, message, args, isPrefix }) {
    const question = isPrefix ? args.join(" ") : interaction.options.getString("question");
    if (!question)
      return isPrefix
        ? message.reply("❌ Please ask something!")
        : interaction.reply({ content: "❌ Please ask something!", ephemeral: true });

    if (interaction) await interaction.deferReply();

    // 🧠 Public AI APIs with fallback
    const apis = [
      // 🔹 OpenGPTX (public AI mirror)
      {
        name: "OpenGPTX",
        url: "https://api.pearktrue.xyz/api/chatgpt",
        method: "POST",
        body: { prompt: question },
      },
      // 🔹 DuckDuckGo Instant Answer
      {
        name: "DuckDuckGo",
        url: `https://api.duckduckgo.com/?q=${encodeURIComponent(question)}&format=json`,
        method: "GET",
      },
      // 🔹 MikuAI mirror
      {
        name: "MikuAI",
        url: `https://api.mikuapi.xyz/v1/ai?ask=${encodeURIComponent(question)}`,
        method: "GET",
      },
      // 🔹 SimSimi public API
      {
        name: "SimSimi",
        url: `https://api.simsimi.net/v2/?text=${encodeURIComponent(question)}&lc=en`,
        method: "GET",
      },
      // 🔹 Some-random public chatbot
      {
        name: "SomeRandom",
        url: `https://some-random-api.com/chatbot?message=${encodeURIComponent(question)}`,
        method: "GET",
      },
    ];

    let answer = null;
    for (const api of apis) {
      try {
        const res = await fetch(api.url, {
          method: api.method,
          headers: { "Content-Type": "application/json" },
          body: api.body ? JSON.stringify(api.body) : undefined,
        });
        const data = await res.json();

        // Try to extract a text-like response
        answer =
          data.answer ||
          data.response ||
          data.result ||
          data.message ||
          data.content ||
          data.Assistant ||
          data.abstract ||
          data.AbstractText ||
          (Array.isArray(data.results) && data.results[0]?.text) ||
          null;

        if (answer) {
          console.log(`✅ Response from: ${api.name}`);
          break;
        }
      } catch (e) {
        console.log(`⚠️ ${api.name} failed`);
      }
    }

    if (!answer)
      answer = "⚠️ All public AI APIs failed to respond. Try again later.";

    const chunks = answer.match(/[\s\S]{1,1900}/g) || ["(empty response)"];
    let page = 0;

    const makeEmbed = () =>
      new EmbedBuilder()
        .setTitle("🤖 AI Response")
        .setDescription(chunks[page])
        .setColor("Random")
        .setFooter({ text: `Page ${page + 1} / ${chunks.length}` });

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
        return i.reply({ content: "❌ You can’t control this message.", ephemeral: true });

      if (i.customId === "next" && page < chunks.length - 1) page++;
      if (i.customId === "prev" && page > 0) page--;

      await i.update({ embeds: [makeEmbed()], components: [makeRow()] });
    });

    collector.on("end", async () => {
      sent.edit({ components: [] }).catch(() => {});
    });
  },
};
    const collector = sent.createMessageComponentCollector({ time: 60000 });

    collector.on("collect", async (i) => {
      const authorId = isPrefix ? message.author.id : interaction.user.id;
      if (i.user.id !== authorId) {
        return i.reply({ content: "❌ Only you can use these buttons!", ephemeral: true });
      }

      if (i.customId === "next" && page < chunks.length - 1) page++;
      if (i.customId === "prev" && page > 0) page--;

      await i.update({ embeds: [makeEmbed()], components: [makeRow()] });
    });

    collector.on("end", () => sent.edit({ components: [] }).catch(() => {}));
  },
};
