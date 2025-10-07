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
  description: "Ask AI anything (multi-API fallback with pagination + all API view)",
  data: new SlashCommandBuilder()
    .setName("ask")
    .setDescription("Ask AI anything (multi-API fallback)")
    .addStringOption(option =>
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

    const apis = [
      {
        name: "MonkeDev",
        url: `https://api.monkedev.com/fun/chat?msg=${encodeURIComponent(question)}&uid=1`
      },
      {
        name: "PawanAI",
        url: `https://api.pawan.krd/v1/chat/completions?ask=${encodeURIComponent(question)}`
      },
      {
        name: "MikuAI",
        url: `https://api.mikuapi.xyz/v1/ai?ask=${encodeURIComponent(question)}`
      },
      {
        name: "SomeRandomAPI",
        url: `https://some-random-api.com/chatbot?message=${encodeURIComponent(question)}`
      },
      {
        name: "DuckDuckGo",
        url: `https://r.jina.ai/http://api.duckduckgo.com/?q=${encodeURIComponent(question)}&format=json`
      },
      {
        name: "Wikipedia",
        url: `https://r.jina.ai/http://en.wikipedia.org/wiki/${encodeURIComponent(question)}`
      }
    ];

    const allResponses = [];

    async function tryAPI(api) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      try {
        const res = await fetch(api.url, { signal: controller.signal });
        clearTimeout(timeout);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const text = await res.text();
        if (text.includes("error") || text.length < 5) throw new Error("Bad data");

        let content;
        try {
          const json = JSON.parse(text);
          content =
            json.response ||
            json.answer ||
            json.output ||
            json.message ||
            json.result ||
            json.content ||
            json.AbstractText ||
            JSON.stringify(json).slice(0, 1000);
        } catch {
          content = text.slice(0, 1000);
        }

        allResponses.push({ api: api.name, result: content });
        console.log(`✅ Responded from ${api.name}`);
        return content;
      } catch (err) {
        console.log(`⚠️ ${api.name} failed: ${err.message}`);
        allResponses.push({ api: api.name, result: `❌ Failed: ${err.message}` });
        return null;
      }
    }

    let mainAnswer = null;
    let usedAPI = "None";

    for (const api of apis) {
      const ans = await tryAPI(api);
      if (ans) {
        mainAnswer = ans;
        usedAPI = api.name;
        break;
      }
    }

    if (!mainAnswer) mainAnswer = "❌ All AI APIs failed. Try again later.";

    // Pagination setup
    const chunks = mainAnswer.match(/[\s\S]{1,1900}/g) || ["(no response)"];
    let page = 0;
    let viewingAll = false;
    let currentAPIIndex = 0;

    const botAvatar = context.client?.user?.displayAvatarURL({ dynamic: true });

    const makeEmbed = () => {
      const title = viewingAll
        ? `🌐 ${allResponses[currentAPIIndex]?.api || "API"} Response`
        : "🤖 AI Response";
      const desc = viewingAll
        ? allResponses[currentAPIIndex]?.result || "No data"
        : chunks[page];

      return new EmbedBuilder()
        .setTitle(title)
        .setDescription(desc)
        .setColor(0x5865f2)
        .setFooter({ text: `💡 Source: ${usedAPI}`, iconURL: botAvatar });
    };

    const makeRow = () =>
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("prev")
          .setLabel("⬅️")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page === 0 || viewingAll),

        new ButtonBuilder()
          .setCustomId("next")
          .setLabel("➡️")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page === chunks.length - 1 || viewingAll),

        new ButtonBuilder()
          .setCustomId("toggleAll")
          .setLabel("🧩 View All APIs")
          .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
          .setCustomId("switchAPI")
          .setLabel("🔄 Next API")
          .setStyle(ButtonStyle.Success)
          .setDisabled(!viewingAll)
      );

    const sent = isSlash
      ? await context.interaction.editReply({ embeds: [makeEmbed()], components: [makeRow()] })
      : await context.message.reply({ embeds: [makeEmbed()], components: [makeRow()] });

    const collector = sent.createMessageComponentCollector({ time: 180000 });

    collector.on("collect", async i => {
      const userId = isSlash
        ? context.interaction.user.id
        : context.message.author.id;
      if (i.user.id !== userId)
        return i.reply({ content: "❌ Only the command user can control this.", ephemeral: true });

      if (i.customId === "next" && page < chunks.length - 1) page++;
      if (i.customId === "prev" && page > 0) page--;
      if (i.customId === "toggleAll") {
        viewingAll = !viewingAll;
        currentAPIIndex = 0;
      }
      if (i.customId === "switchAPI" && viewingAll) {
        currentAPIIndex = (currentAPIIndex + 1) % allResponses.length;
      }

      await i.update({ embeds: [makeEmbed()], components: [makeRow()] });
    });

    collector.on("end", () => sent.edit({ components: [] }).catch(() => {}));
  }
};
