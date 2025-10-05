const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

module.exports = {
  name: "ask",
  description: "Ask AI anything using public APIs (with fallback).",
  aliases: ["ai", "chatgpt", "question"],

  async execute(client, message, args, interaction) {
    const isSlash = !!interaction;
    const question = isSlash
      ? interaction.options.getString("question")
      : args.join(" ");

    if (!question) {
      const msg = "❌ Please ask a question!";
      if (isSlash) return interaction.reply({ content: msg, ephemeral: true });
      return message.reply(msg);
    }

    if (isSlash) await interaction.deferReply();

    // 🧠 List of public APIs for fallback
    const apis = [
      {
        name: "PearkTrue",
        url: "https://api.pearktrue.xyz/api/chatgpt",
        method: "POST",
        body: { prompt: question },
      },
      {
        name: "DuckDuckGo",
        url: `https://api.duckduckgo.com/?q=${encodeURIComponent(question)}&format=json`,
        method: "GET",
      },
      {
        name: "MikuAI",
        url: `https://api.mikuapi.xyz/v1/ai?ask=${encodeURIComponent(question)}`,
        method: "GET",
      },
      {
        name: "SimSimi",
        url: `https://api.simsimi.net/v2/?text=${encodeURIComponent(question)}&lc=en`,
        method: "GET",
      },
      {
        name: "SomeRandomAPI",
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
        answer =
          data.answer ||
          data.response ||
          data.result ||
          data.message ||
          data.content ||
          data.assistant ||
          data.abstract ||
          data.AbstractText ||
          (Array.isArray(data.results) && data.results[0]?.text) ||
          null;

        if (answer) {
          console.log(`✅ Response from ${api.name}`);
          break;
        }
      } catch (err) {
        console.log(`⚠️ ${api.name} failed: ${err.message}`);
      }
    }

    if (!answer) answer = "⚠️ All AI APIs failed to respond. Try again later.";

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

    const sent = isSlash
      ? await interaction.editReply({ embeds: [makeEmbed()], components: [makeRow()] })
      : await message.reply({ embeds: [makeEmbed()], components: [makeRow()] });

    const collector = sent.createMessageComponentCollector({ time: 60000 });

    collector.on("collect", async (i) => {
      const authorId = isSlash ? interaction.user.id : message.author.id;
      if (i.user.id !== authorId)
        return i.reply({ content: "❌ Only you can control this.", ephemeral: true });

      if (i.customId === "next" && page < chunks.length - 1) page++;
      if (i.customId === "prev" && page > 0) page--;

      await i.update({ embeds: [makeEmbed()], components: [makeRow()] });
    });

    collector.on("end", () => {
      sent.edit({ components: [] }).catch(() => {});
    });
  },
};
