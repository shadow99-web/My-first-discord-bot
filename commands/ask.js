const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

module.exports = {
  name: "ask",
  description: "Ask AI anything (Render-safe, multi-API fallback)",
  data: new SlashCommandBuilder()
    .setName("ask")
    .setDescription("Ask AI anything (Render-safe, multi-API fallback)")
    .addStringOption((option) =>
      option
        .setName("question")
        .setDescription("Your question for the AI")
        .setRequired(true)
    ),

  async execute(context) {
    const isSlash = !!context.interaction;
    const question = isSlash
      ? context.interaction.options.getString("question")
      : context.args?.join(" ");

    if (!question) {
      const msg = "❌ Please ask a question!";
      if (isSlash)
        return context.interaction.reply({ content: msg, ephemeral: true });
      else return context.message.reply(msg);
    }

    if (isSlash) await context.interaction.deferReply();

    // Render-safe public endpoints
    const apis = [
      {
        name: "Jina-Wikipedia",
        url: `https://r.jina.ai/http://en.wikipedia.org/wiki/${encodeURIComponent(
          question
        )}`,
        method: "GET"
      },
      {
        name: "Jina-DuckDuckGo",
        url: `https://r.jina.ai/http://api.duckduckgo.com/?q=${encodeURIComponent(
          question
        )}&format=json`,
        method: "GET"
      },
      {
        name: "HuggingFace GPT2",
        url: "https://api-inference.huggingface.co/models/gpt2",
        method: "POST",
        body: { inputs: question },
        headers: { "Content-Type": "application/json" }
      },
      {
        name: "Jina-Fallback",
        url: `https://r.jina.ai/http://textise.net/showtext.aspx?strURL=https://www.google.com/search?q=${encodeURIComponent(
          question
        )}`,
        method: "GET"
      }
    ];

    let answer = null;
    let usedAPI = "None";

    async function tryAPI(api) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 7000);
      try {
        const res = await fetch(api.url, {
          method: api.method,
          headers: api.headers || {},
          body: api.body ? JSON.stringify(api.body) : undefined,
          signal: controller.signal
        });
        clearTimeout(timeout);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const text = await res.text();
        if (text.length < 5) throw new Error("Empty response");

        try {
          const json = JSON.parse(text);
          return (
            json.generated_text ||
            json.response ||
            json.answer ||
            json.result ||
            json.content ||
            json.message ||
            JSON.stringify(json).slice(0, 500)
          );
        } catch {
          // For text-based responses (Wikipedia/Jina)
          return text.slice(0, 1500);
        }
      } catch (err) {
        console.log(`⚠️ ${api.name} failed: ${err.message}`);
        return null;
      }
    }

    for (const api of apis) {
      answer = await tryAPI(api);
      if (answer) {
        usedAPI = api.name;
        console.log(`✅ Response from ${api.name}`);
        break;
      }
    }

    if (!answer) answer = "❌ All public APIs failed. Try again later.";

    // Split long text into pages
    const chunks = answer.match(/[\s\S]{1,1900}/g) || ["(no response)"];
    let page = 0;

    const botAvatar =
      context.client?.user?.displayAvatarURL?.({ dynamic: true }) || null;

    const makeEmbed = () =>
      new EmbedBuilder()
        .setTitle("🤖 AI Response")
        .setDescription(chunks[page])
        .setColor(0x5865f2)
        .setFooter({ text: `💡 Source: ${usedAPI}`, iconURL: botAvatar });

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
      ? await context.interaction.editReply({
          embeds: [makeEmbed()],
          components: [makeRow()]
        })
      : await context.message.reply({
          embeds: [makeEmbed()],
          components: [makeRow()]
        });

    const collector = sent.createMessageComponentCollector({ time: 120000 });

    collector.on("collect", async (i) => {
      const userId = isSlash
        ? context.interaction.user.id
        : context.message.author.id;

      if (i.user.id !== userId)
        return i.reply({
          content: "❌ Only the command user can control this.",
          ephemeral: true
        });

      if (i.customId === "next" && page < chunks.length - 1) page++;
      if (i.customId === "prev" && page > 0) page--;

      await i.update({ embeds: [makeEmbed()], components: [makeRow()] });
    });

    collector.on("end", () => sent.edit({ components: [] }).catch(() => {}));
  }
};
