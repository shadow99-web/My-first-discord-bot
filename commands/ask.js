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
  description: "Ask AI anything using multi-API fallback (Render-safe)",
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

    // ✅ Render-safe APIs (no auth, use proxy-friendly routes)
    const apis = [
      {
        name: "AffiliatePlus",
        url: `https://api.affiliateplus.xyz/api/chatbot?message=${encodeURIComponent(
          question
        )}&botname=AI&ownername=User`,
        method: "GET",
      },
      {
        name: "DuckDuckGo (via Jina)",
        url: `https://r.jina.ai/http://api.duckduckgo.com/?q=${encodeURIComponent(
          question
        )}&format=json&no_html=1`,
        method: "GET",
      },
      {
        name: "Wikipedia (via Jina)",
        url: `https://r.jina.ai/http://en.wikipedia.org/wiki/${encodeURIComponent(
          question.replace(/\s+/g, "_")
        )}`,
        method: "GET",
      },
      {
        name: "GptGo Proxy",
        url: `https://r.jina.ai/https://gptgo.ai/?q=${encodeURIComponent(
          question
        )}`,
        method: "GET",
      },
      {
        name: "Lexica (concept search)",
        url: `https://r.jina.ai/http://lexica.art/api/v1/search?q=${encodeURIComponent(
          question
        )}`,
        method: "GET",
      },
    ];

    const responses = [];

    async function tryAPI(api) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      try {
        const res = await fetch(api.url, {
          method: api.method,
          headers: api.headers || {},
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();

        // Try parse JSON or return text fallback
        try {
          const json = JSON.parse(text);
          return (
            json.message ||
            json.answer ||
            json.result ||
            json.AbstractText ||
            json.response ||
            json.output ||
            JSON.stringify(json).slice(0, 600)
          );
        } catch {
          return text.slice(0, 600);
        }
      } catch (err) {
        console.log(`⚠️ ${api.name} failed: ${err.message}`);
        return `⚠️ ${api.name} failed: ${err.message}`;
      }
    }

    // Fetch all APIs one by one (sequentially to avoid rate block)
    for (const api of apis) {
      const output = await tryAPI(api);
      responses.push({ name: api.name, text: output });
    }

    // Filter out valid answers
    const valid = responses.filter(r => !r.text.startsWith("⚠️"));
    let index = 0;

    const botAvatar =
      context.client?.user?.displayAvatarURL?.({ dynamic: true }) || null;

    const makeEmbed = () =>
      new EmbedBuilder()
        .setTitle("🤖 AI Response")
        .setDescription(valid[index]?.text || "❌ No valid answer found.")
        .setColor(0x5865f2)
        .setFooter({
          text: `💡 Source: ${valid[index]?.name || "N/A"} (${index + 1}/${
            valid.length
          })`,
          iconURL: botAvatar,
        });

    const makeRow = () =>
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("prev")
          .setLabel("⬅️ Prev")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(index === 0),
        new ButtonBuilder()
          .setCustomId("next")
          .setLabel("Next ➡️")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(index === valid.length - 1),
        new ButtonBuilder()
          .setCustomId("all")
          .setLabel("📜 View All")
          .setStyle(ButtonStyle.Primary)
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

    collector.on("collect", async i => {
      const userId = isSlash
        ? context.interaction.user.id
        : context.message.author.id;
      if (i.user.id !== userId)
        return i.reply({
          content: "❌ Only you can control this.",
          ephemeral: true,
        });

      if (i.customId === "next" && index < valid.length - 1) index++;
      if (i.customId === "prev" && index > 0) index--;

      if (i.customId === "all") {
        const allText = responses
          .map(r => `**${r.name}:**\n${r.text}\n`)
          .join("\n──────────────\n")
          .slice(0, 3900);
        return i.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle("🧩 All API Responses")
              .setDescription(allText)
              .setColor(0x5865f2)
              .setFooter({ text: "All collected API outputs", iconURL: botAvatar }),
          ],
          ephemeral: true,
        });
      }

      await i.update({ embeds: [makeEmbed()], components: [makeRow()] });
    });

    collector.on("end", () => {
      sent.edit({ components: [] }).catch(() => {});
    });
  },
};
