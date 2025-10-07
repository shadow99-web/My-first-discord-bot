const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

module.exports = {
  name: "ask",
  description: "Ask AI anything (multi-API fallback with pagination)",
  data: new SlashCommandBuilder()
    .setName("ask")
    .setDescription("Ask AI anything (multi-API fallback)")
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

    // ✅ Working Public APIs
    const apis = [
      {
        name: "PawanAI",
        url: `https://api.pawan.krd/v1/chat/completions`,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "pai-001",
          messages: [{ role: "user", content: question }],
        }),
      },
      {
        name: "MikuAI",
        url: `https://api.mikuapi.xyz/v1/ai?ask=${encodeURIComponent(
          question
        )}`,
        method: "GET",
      },
      {
        name: "SomeRandomAPI",
        url: `https://some-random-api.com/chatbot?message=${encodeURIComponent(
          question
        )}`,
        method: "GET",
        headers: { "User-Agent": "Mozilla/5.0 (DiscordBot)" },
      },
      {
        name: "MonkeDev",
        url: `https://api.monkedev.com/fun/chat?msg=${encodeURIComponent(
          question
        )}&uid=1`,
        method: "GET",
      },
      {
        name: "VercelGPT",
        url: `https://chatgpt.apine.dev/api/gpt?query=${encodeURIComponent(
          question
        )}`,
        method: "GET",
      },
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
          body: api.body || undefined,
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const text = await res.text();
        if (text.includes("error") || text.length < 5)
          throw new Error("Bad data");

        try {
          const json = JSON.parse(text);
          return (
            json.response ||
            json.answer ||
            json.output ||
            json.message ||
            json.result ||
            json.content ||
            (json.choices?.[0]?.message?.content ?? null) ||
            JSON.stringify(json).slice(0, 500)
          );
        } catch {
          return text.slice(0, 500);
        }
      } catch (err) {
        console.log(`⚠️ ${api.name} failed: ${err.message}`);
        return null;
      }
    }

    // Try each API until one succeeds
    for (const api of apis) {
      answer = await tryAPI(api);
      if (answer) {
        usedAPI = api.name;
        console.log(`✅ Responded from ${api.name}`);
        break;
      }
    }

    if (!answer) answer = "❌ All AI APIs failed. Try again later.";

    // Split into multiple pages if too long
    const chunks = answer.match(/[\s\S]{1,1900}/g) || ["(no response)"];
    let page = 0;

    const botAvatar =
      context.client?.user?.displayAvatarURL?.({ dynamic: true }) || null;

    const makeEmbed = () =>
      new EmbedBuilder()
        .setTitle("🤖 AI Response")
        .setDescription(chunks[page])
        .setColor(0x5865f2)
        .setFooter({
          text: `💡 Source: ${usedAPI}`,
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
          .setDisabled(page === chunks.length - 1)
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

      await i.update({ embeds: [makeEmbed()], components: [makeRow()] });
    });

    collector.on("end", () => {
      sent.edit({ components: [] }).catch(() => {});
    });
  },
};
