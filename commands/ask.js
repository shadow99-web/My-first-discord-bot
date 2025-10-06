// commands/ask.js
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

const FETCH_TIMEOUT = 8000; // ms

async function fetchWithTimeout(url, opts = {}, timeout = FETCH_TIMEOUT) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal });
    clearTimeout(id);
    return res;
  } finally {
    clearTimeout(id);
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ask")
    .setDescription("Ask AI anything using public APIs")
    .addStringOption(o => o.setName("question").setDescription("Your question").setRequired(true)),

  async execute(context) {
    const isSlash = !context.isPrefix;
    const question = isSlash ? context.interaction.options.getString("question") : context.args.join(" ");
    if (!question) {
      const msg = "❌ Please ask a question!";
      if (isSlash) return context.interaction.reply({ content: msg, ephemeral: true });
      return context.message.reply(msg);
    }

    // Defer for slash so we can edit later
    if (isSlash) await context.interaction.deferReply();

    // ---------- API callers (stable, render-friendly) ----------
    const callers = [
      {
        name: "AffiliatePlus",
        call: async () => {
          const url = `https://api.affiliateplus.xyz/api/chatbot?message=${encodeURIComponent(question)}&botname=Shadow&ownername=Jeetendra`;
          const res = await fetchWithTimeout(url);
          if (!res.ok) throw new Error(`status ${res.status}`);
          const d = await res.json();
          return d?.message || d?.reply || null;
        }
      },
      {
        name: "DuckDuckGo",
        call: async () => {
          const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(question)}&format=json`;
          const res = await fetchWithTimeout(url);
          if (!res.ok) throw new Error(`status ${res.status}`);
          const d = await res.json();
          return d?.AbstractText || d?.Answer || d?.Heading || d?.Abstract || null;
        }
      },
      {
        name: "Wikipedia",
        call: async () => {
          const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(question)}`;
          const res = await fetchWithTimeout(url);
          if (!res.ok) throw new Error(`status ${res.status}`);
          const d = await res.json();
          return d?.extract || null;
        }
      },
      {
        name: "Brainshop",
        call: async () => {
          // public example endpoint — if you have your own keys, replace them
          const url = `http://api.brainshop.ai/get?bid=177601&key=FrUqYZpHZ7wP0vMP&uid=1&msg=${encodeURIComponent(question)}`;
          const res = await fetchWithTimeout(url);
          if (!res.ok) throw new Error(`status ${res.status}`);
          const d = await res.json();
          return d?.cnt || null;
        }
      },
      {
        name: "SomeRandom",
        call: async () => {
          const url = `https://some-random-api.com/chatbot?message=${encodeURIComponent(question)}`;
          const res = await fetchWithTimeout(url);
          if (!res.ok) throw new Error(`status ${res.status}`);
          const d = await res.json();
          // SomeRandom returns { response: "..." }
          return d?.response || d?.message || d?.reply || null;
        }
      }
    ];

    // ---------- Optional OpenRouter (only used if OPENROUTER_API_KEY is set) ----------
    const openRouterKey = process.env.OPENROUTER_API_KEY;
    if (openRouterKey) {
      callers.unshift({
        name: "OpenRouter",
        call: async () => {
          // NOTE: adjust model if you want another one available in your OpenRouter account
          const url = "https://api.openrouter.ai/v1/chat/completions";
          const body = {
            model: "gpt-4o-mini", // common available model; change if needed
            messages: [{ role: "user", content: question }]
          };
          const res = await fetchWithTimeout(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${openRouterKey}`
            },
            body: JSON.stringify(body)
          }, 12000); // give a bit more time for OpenRouter
          if (!res.ok) {
            const txt = await res.text().catch(() => "");
            throw new Error(`status ${res.status} ${txt.slice(0, 200)}`);
          }
          const d = await res.json();
          // many completions-style responses live in d.choices[0].message.content
          return d?.choices?.[0]?.message?.content || d?.choices?.[0]?.text || d?.output || null;
        }
      });
    }

    // ---------- Try callers in order ----------
    let answer = null;
    let usedSource = "None";
    for (const api of callers) {
      try {
        const result = await api.call();
        if (result && typeof result === "string" && result.trim()) {
          answer = result.trim();
          usedSource = api.name;
          console.log(`✅ ${api.name} answered`);
          break;
        }
      } catch (err) {
        console.log(`⚠️ ${api.name} failed: ${err?.message || err}`);
      }
    }

    // ---------- Smart fallback if nothing returned ----------
    if (!answer) {
      try {
        const wikiRes = await fetchWithTimeout(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(question)}`, {}, 6000).then(r => r.ok ? r.json().catch(()=>null) : null).catch(()=>null);
        const duckRes = await fetchWithTimeout(`https://api.duckduckgo.com/?q=${encodeURIComponent(question)}&format=json`, {}, 6000).then(r => r.ok ? r.json().catch(()=>null) : null).catch(()=>null);
        const wiki = wikiRes?.extract || "";
        const duck = duckRes?.AbstractText || duckRes?.Heading || "";
        if (wiki || duck) {
          answer = `Here's what I found:\n\n${wiki || duck}\n\nIn short — ${question}.`;
          usedSource = "SmartFallback";
        } else {
          answer = `Hmm 🤔 I couldn't fetch a direct answer. Try rephrasing the question or use /ask with a different query.`;
          usedSource = "AI-Fallback";
        }
      } catch (err) {
        answer = "⚠️ All sources failed. Try again later.";
        usedSource = "None";
      }
    }

    // ---------- Build paginated embed ----------
    const chunks = answer.match(/[\s\S]{1,1900}/g) || ["(empty response)"];
    let page = 0;

    const makeEmbed = () => new EmbedBuilder()
      .setTitle("🤖 AI Response")
      .setDescription(chunks[page])
      .setColor(0x5865F2)
      .setFooter({ text: `Page ${page + 1} / ${chunks.length} | Source: ${usedSource}` });

    const makeRow = () => new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("ask_prev").setLabel("⬅️ Prev").setStyle(ButtonStyle.Primary).setDisabled(page === 0),
      new ButtonBuilder().setCustomId("ask_next").setLabel("Next ➡️").setStyle(ButtonStyle.Primary).setDisabled(page === chunks.length - 1),
      new ButtonBuilder().setCustomId("ask_regen").setLabel("🔁 Regenerate").setStyle(ButtonStyle.Secondary)
    );

    // Send or edit the reply
    let sent;
    if (isSlash) {
      sent = await context.interaction.editReply({ embeds: [makeEmbed()], components: [makeRow()] });
    } else {
      sent = await context.message.reply({ embeds: [makeEmbed()], components: [makeRow()] });
    }

    // Collector (only original user can use buttons)
    const collector = sent.createMessageComponentCollector({ time: 120000 });
    collector.on("collect", async (btn) => {
      const authorId = isSlash ? context.interaction.user.id : context.message.author.id;
      if (btn.user.id !== authorId) return btn.reply({ content: "❌ Only the command user can use these buttons.", ephemeral: true });

      if (btn.customId === "ask_next" && page < chunks.length - 1) page++;
      if (btn.customId === "ask_prev" && page > 0) page--;
      if (btn.customId === "ask_regen") {
        await btn.deferUpdate();
        // regenerate using next available API (rotate callers)
        let regenAnswer = null;
        let regenSource = "None";
        // rotate callers by moving the successful one to the end so we try new ones first (simple)
        const rotated = callers.slice(1).concat(callers[0]);
        for (const api of rotated) {
          try {
            const r = await api.call();
            if (r && typeof r === "string" && r.trim()) {
              regenAnswer = r.trim();
              regenSource = api.name;
              break;
            }
          } catch (e) {
            console.log(`🔁 regen ${api.name} failed`);
          }
        }
        if (!regenAnswer) {
          regenAnswer = "⚠️ Could not regenerate a new answer. Try again later.";
          regenSource = "None";
        }
        // update chunks & reset page
        const newChunks = regenAnswer.match(/[\s\S]{1,1900}/g) || ["(empty)"];
        page = 0;
        // update local variables for embed builder closure
        answer = regenAnswer;
        usedSource = regenSource;
        // update message
        await btn.update({ embeds: [makeEmbed()], components: [makeRow()] });
        return;
      }

      await btn.update({ embeds: [makeEmbed()], components: [makeRow()] });
    });

    collector.on("end", async () => {
      try { await sent.edit({ components: [] }); } catch (e) { /* ignore */ }
    });
  }
};
