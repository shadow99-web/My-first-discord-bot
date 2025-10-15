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
  description: "Ask AI anything using Gemini with automatic fallback",
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
    const geminiModels = ["gemini-1.5-flash", "gemini-1.5-pro"];

    async function askGemini(model, text) {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text }] }],
          }),
        }
      );
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Gemini ${model} failed: HTTP ${res.status} → ${errText.slice(0, 100)}`);
      }
      const data = await res.json();
      return (
        data?.candidates?.[0]?.content?.parts?.[0]?.text ||
        data?.candidates?.[0]?.output_text ||
        null
      );
    }

    let finalAnswer = null;
    let usedAPI = null;
    let responses = [];

    // 🧠 Try Gemini first (Flash → Pro)
    for (const model of geminiModels) {
      try {
        const ans = await askGemini(model, question);
        if (ans) {
          finalAnswer = ans;
          usedAPI = `Gemini (${model})`;
          break;
        }
      } catch (err) {
        console.log("⚠️", err.message);
        responses.push(`**${model}:** ${err.message}`);
      }
    }

    // 🔁 Fallback to other public APIs if Gemini fails
    if (!finalAnswer) {
      const backups = [
        {
          name: "PawanAI",
          url: `https://api.pawan.krd/api/chat/send`,
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bot: "gpt", text: question, user: "1" }),
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
          name: "MonkeDev",
          url: `https://api.monkedev.com/fun/chat?msg=${encodeURIComponent(question)}&uid=1`,
          method: "GET",
          extract: (json) => json.response,
        },
      ];

      async function tryBackup(api) {
        try {
          const res = await fetch(api.url, {
            method: api.method,
            headers: api.headers || {},
            body: api.body || null,
          });
          const text = await res.text();
          let data;
          try {
            data = JSON.parse(text);
          } catch {
            data = text;
          }
          const extracted = api.extract ? api.extract(data) : data;
          if (extracted) return extracted;
        } catch (err) {
          console.log(`⚠️ ${api.name} failed: ${err.message}`);
        }
        return null;
      }

      for (const api of backups) {
        const ans = await tryBackup(api);
        responses.push(`**${api.name}:** ${ans || "failed"}`);
        if (ans) {
          finalAnswer = ans;
          usedAPI = api.name;
          break;
        }
      }
    }

    // 🟢 Display result
    if (!finalAnswer) finalAnswer = "❌ All APIs failed. Please try again.";

    const chunks = finalAnswer.match(/[\s\S]{1,1900}/g) || ["(no response)"];
    let page = 0;

    const makeEmbed = (desc = chunks[page]) =>
      new EmbedBuilder()
        .setTitle("💬 AI Response")
        .setDescription(desc)
        .setColor(0x00a67e)
        .setFooter({
          text: `🤖 ${usedAPI || "Unknown"} | Page ${page + 1}/${chunks.length}`,
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
          .setLabel("📚 View Logs")
          .setStyle(ButtonStyle.Secondary)
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

      if (i.customId === "view_all")
        return i.reply({ content: responses.join("\n"), ephemeral: true });

      await i.update({ embeds: [makeEmbed()], components: [makeRow()] });
    });

    collector.on("end", () => {
      sent.edit({ components: [] }).catch(() => {});
    });
  },
};
