const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const fetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args));

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ask")
    .setDescription("Ask AI or get information using public APIs")
    .addStringOption(option =>
      option.setName("question")
        .setDescription("Your question for the AI")
        .setRequired(true)
    ),

  async execute(context) {
    const isSlash = !context.isPrefix;
    const question = isSlash
      ? context.interaction.options.getString("question")
      : context.args.join(" ");

    if (!question) {
      const msg = "❌ Please ask a question!";
      if (isSlash) return context.interaction.reply({ content: msg, ephemeral: true });
      return context.message.reply(msg);
    }

    if (isSlash) await context.interaction.deferReply();

    // ✅ Public, keyless APIs (Render safe)
    const apis = [
      { name: "AffiliatePlus", url: `https://api.affiliateplus.xyz/api/chatbot?message=${encodeURIComponent(question)}&botname=Shadow&ownername=Jeetendra`, extract: d => d.message },
      { name: "DuckDuckGo", url: `https://api.duckduckgo.com/?q=${encodeURIComponent(question)}&format=json`, extract: d => d.AbstractText || d.Answer || d.Heading || d.Abstract || null },
      { name: "Wikipedia", url: `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(question)}`, extract: d => d.extract },
      { name: "Brainshop", url: `http://api.brainshop.ai/get?bid=177601&key=FrUqYZpHZ7wP0vMP&uid=1&msg=${encodeURIComponent(question)}`, extract: d => d.cnt },
      { name: "SomeRandomAPI", url: `https://some-random-api.com/chatbot?message=${encodeURIComponent(question)}`, extract: d => d.response },
    ];

    let answer = null;
    let usedApi = "None";

    for (const api of apis) {
      try {
        const res = await fetch(api.url);
        if (!res.ok) continue;
        const data = await res.json();
        const result = api.extract(data);
        if (result && typeof result === "string" && result.trim()) {
          answer = result.trim();
          usedApi = api.name;
          break;
        }
      } catch (err) {
        console.log(`⚠️ ${api.name} failed: ${err.message}`);
      }
    }

    // 🧠 Smart Fallback (AI-like generator)
    if (!answer) {
      try {
        // Try to fetch context from Wikipedia / DuckDuckGo
        const wiki = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(question)}`).then(r => r.json()).catch(() => null);
        const duck = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(question)}&format=json`).then(r => r.json()).catch(() => null);

        const wikiExtract = wiki?.extract || "";
        const duckExtract = duck?.AbstractText || duck?.Heading || "";

        // Combine info with a "natural" AI-style response
        if (wikiExtract || duckExtract) {
          answer = `Here’s what I found:\n\n**${wikiExtract || duckExtract}**\n\nIn simpler words, it refers to *${question.toLowerCase()}* as a concept with general meaning or use.`;
          usedApi = "SmartFallback";
        } else {
          // Last resort — template-generated “AI answer”
          answer = `Hmm 🤔 I’m not entirely sure what "${question}" means, but it sounds interesting! Maybe it refers to a topic people often search about.`;
          usedApi = "AI-Fallback";
        }
      } catch {
        answer = "⚠️ All sources failed. Please try again later.";
      }
    }

    // 🧩 Split into chunks (for long messages)
    const chunks = answer.match(/[\s\S]{1,1900}/g) || ["(empty response)"];
    let page = 0;

    const makeEmbed = () =>
      new EmbedBuilder()
        .setTitle("🤖 AI Response")
        .setDescription(chunks[page])
        .setColor(0x5865F2)
        .setFooter({ text: `Page ${page + 1} / ${chunks.length} | Source: ${usedApi}` });

    const makeRow = () =>
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("prev").setLabel("⬅️").setStyle(ButtonStyle.Primary).setDisabled(page === 0),
        new ButtonBuilder().setCustomId("next").setLabel("➡️").setStyle(ButtonStyle.Primary).setDisabled(page === chunks.length - 1)
      );

    const sent = isSlash
      ? await context.interaction.editReply({ embeds: [makeEmbed()], components: [makeRow()] })
      : await context.message.reply({ embeds: [makeEmbed()], components: [makeRow()] });

    const collector = sent.createMessageComponentCollector({ time: 60000 });
    collector.on("collect", async (i) => {
      const authorId = isSlash ? context.interaction.user.id : context.message.author.id;
      if (i.user.id !== authorId) return i.reply({ content: "❌ Only you can control this.", ephemeral: true });
      if (i.customId === "next" && page < chunks.length - 1) page++;
      if (i.customId === "prev" && page > 0) page--;
      await i.update({ embeds: [makeEmbed()], components: [makeRow()] });
    });
    collector.on("end", () => sent.edit({ components: [] }).catch(() => {}));
  }
};
