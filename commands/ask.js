const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

const fetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args));

module.exports = {
  name: "ask",
  description: "Ask AI anything using Gemini with multi-API fallback",
  data: new SlashCommandBuilder()
    .setName("ask")
    .setDescription("Ask AI anything (Gemini + fallback APIs)")
    .addStringOption((option) =>
      option.setName("question").setDescription("Your question for the AI").setRequired(true)
    ),

  async execute(context) {
    const isSlash = !!context.interaction;
    const question = isSlash
      ? context.interaction.options.getString("question")
      : context.args?.join(" ");

    if (!question) {
      const msg = "❌ Please provide a question!";
      if (isSlash)
        return context.interaction.reply({ content: msg, ephemeral: true });
      else return context.message.reply(msg);
    }

    if (isSlash) await context.interaction.deferReply();

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    const apis = [
      {
        name: "Gemini",
        url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: question }] }],
        }),
        extract: (json) =>
          json?.candidates?.[0]?.content?.parts?.[0]?.text ||
          json?.candidates?.[0]?.output_text ||
          null,
      },
      {
        name: "PawanAI",
        url: `https://api.pawan.krd/api/chat/send`,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bot: "gpt",
          text: question,
          user: "1",
        }),
        extract: (json) => json.message,
      },
      {
        name: "DuckDuckGo (via Jina)",
        url: `https://r.jina.ai/http://api.duckduckgo.com/?q=${encodeURIComponent(
          question
        )}&format=json`,
        method: "GET",
        extract: (json) =>
          json.AbstractText ||
          json.RelatedTopics?.[0]?.Text ||
          json.Answer ||
          json.Definition ||
          null,
      },
      {
        name: "Wikipedia (via Jina)",
        url: `https://r.jina.ai/http://en.wikipedia.org/wiki/${encodeURIComponent(
          question
        )}`,
        method: "GET",
        extract: (text) =>
          typeof text === "string"
            ? text.slice(0, 800)
            : JSON.stringify(text).slice(0, 800),
      },
      {
        name: "MonkeDev",
        url: `https://api.monkedev.com/fun/chat?msg=${encodeURIComponent(
          question
        )}&uid=1`,
        method: "GET",
        extract: (json) => json.response,
      },
      {
        name: "SomeRandomAPI",
        url: `https://some-random-api.com/chatbot?message=${encodeURIComponent(
          question
        )}`,
        method: "GET",
        extract: (json) => json.response,
      },
    ];

    let responses = [];
    let finalAnswer = null;
    let usedAPI = null;

    async function tryAPI(api) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      try {
        const res = await fetch(api.url, {
          method: api.method,
          headers: api.headers || {},
          body: api.body || null,
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        let data;
        const text = await res.text();
        try {
          data = JSON.parse(text);
        } catch {
          data = text;
        }

        const extracted = api.extract ? api.extract(data) : data;
        if (!extracted) throw new Error("No valid response");
        return extracted;
      } catch (err) {
        console.log(`⚠️ ${api.name} failed: ${err.message}`);
        return `⚠️ ${api.name} failed: ${err.message}`;
      }
    }

    for (const api of apis) {
      const result = await tryAPI(api);
      responses.push(`**${api.name}:**\n${result}\n──────────────`);
      if (!result.startsWith("⚠️") && !finalAnswer) {
        finalAnswer = result;
        usedAPI = api.name;
      }
    }

    const botAvatar =
      context.client?.user?.displayAvatarURL?.({ dynamic: true }) || null;

    if (!finalAnswer) finalAnswer = "❌ All APIs failed. Please try again.";

    const chunks = finalAnswer.match(/[\s\S]{1,1900}/g) || ["(no response)"];
    let page = 0;

    const makeEmbed = (desc = chunks[page]) =>
      new EmbedBuilder()
        .setTitle("💬 AI Response")
        .setDescription(desc)
        .setColor(0x00a67e)
        .setFooter({
          text: `🤖 ${usedAPI || "Multi-API"} | Page ${page + 1}/${chunks.length}`,
          iconURL: botAvatar,
        });

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
          .setDisabled(page === chunks.length - 1),
        new ButtonBuilder()
          .setCustomId("view_all")
          .setLabel("📚 View All API Results")
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId("retry")
          .setLabel("🔁 Retry")
          .setStyle(ButtonStyle.Success)
      );

    const sent = isSlash
      ? await context.interaction.editReply({
          embeds: [makeEmbed()],
          components: [makeRow()],
        })
      : await context.message.reply({
          embeds: [makeEmbed()],
          components: [makeRow()],
        });

    const collector = sent.createMessageComponentCollector({ time: 120000 });

    collector.on("collect", async (i) => {
      const userId = isSlash
        ? context.interaction.user.id
        : context.message.author.id;

      if (i.user.id !== userId)
        return i.reply({
          content: "❌ Only the command user can control this.",
          ephemeral: true,
        });

      if (i.customId === "next" && page < chunks.length - 1) page++;
      if (i.customId === "prev" && page > 0) page--;

      if (i.customId === "view_all") {
        return i.reply({
          content: responses.join("\n"),
          ephemeral: true,
        });
      }

      if (i.customId === "retry") {
        await i.deferReply({ ephemeral: true });
        const newResult = await tryAPI(apis[0]); // Gemini retry
        await i.followUp({
          content: newResult || "❌ Retry failed.",
          ephemeral: true,
        });
        return;
      }

      await i.update({ embeds: [makeEmbed()], components: [makeRow()] });
    });

    collector.on("end", () => {
      sent.edit({ components: [] }).catch(() => {});
    });
  },
};
