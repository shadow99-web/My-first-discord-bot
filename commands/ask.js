const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

module.exports = {
  name: "ask",
  description: "Ask AI anything!",
  options: [
    {
      name: "question",
      type: 3,
      description: "Your question for AI",
      required: true,
    },
  ],

  async execute({ client, interaction, message, args, isPrefix }) {
    const question = isPrefix ? args.join(" ") : interaction.options.getString("question");
    if (!question) {
      const msg = "❌ Please provide a question!";
      return isPrefix ? message.reply(msg) : interaction.reply({ content: msg, ephemeral: true });
    }

    if (interaction) await interaction.deferReply();

    const apis = [
      async () => {
        const res = await fetch("https://torgpt.space/api/v1/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: [{ role: "user", content: question }] })
        });
        const data = await res.json();
        return data.response || data.choices?.[0]?.message?.content;
      },
      async () => {
        const res = await fetch("https://api.freegpt4.ddns.net/api/v1/text", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: question })
        });
        const data = await res.json();
        return data.output || data.text;
      },
      async () => {
        const res = await fetch("https://gptgo.ai/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ q: question })
        });
        const data = await res.json();
        return data.answer || data.result;
      },
      async () => {
        const res = await fetch("https://chatforfree.org/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: question })
        });
        const data = await res.json();
        return data.response || data.reply;
      },
      async () => {
        if (!process.env.DEEPAI_KEY) throw new Error("No DEEPAI_KEY");
        const res = await fetch("https://api.deepai.org/api/text-generator", {
          method: "POST",
          headers: { "Api-Key": process.env.DEEPAI_KEY },
          body: new URLSearchParams({ text: question })
        });
        const data = await res.json();
        return data.output;
      }
    ];

    let answer = null;
    for (const api of apis) {
      try {
        answer = await Promise.race([
          api(),
          new Promise((_, r) => setTimeout(() => r(new Error("timeout")), 7000))
        ]);
        if (answer) break;
      } catch (err) {
        console.log("⚠️ API failed:", err.message);
      }
    }

    if (!answer) {
      const failMsg = "⚠️ All public AI APIs failed. Please try again later!";
      return isPrefix ? message.reply(failMsg) : interaction.editReply(failMsg);
    }

    const chunks = answer.match(/[\s\S]{1,1900}/g) || ["(empty response)"];
    let page = 0;

    const makeEmbed = () =>
      new EmbedBuilder()
        .setTitle("🤖 AI Response")
        .setDescription(chunks[page])
        .setFooter({ text: `Page ${page + 1} / ${chunks.length}` })
        .setColor("Random");

    const makeRow = () =>
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("prev").setLabel("⬅️").setStyle(ButtonStyle.Primary).setDisabled(page === 0),
        new ButtonBuilder().setCustomId("next").setLabel("➡️").setStyle(ButtonStyle.Primary).setDisabled(page === chunks.length - 1)
      );

    const sent = isPrefix
      ? await message.reply({ embeds: [makeEmbed()], components: [makeRow()] })
      : await interaction.editReply({ embeds: [makeEmbed()], components: [makeRow()] });

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
