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

  // Slash command
  async execute(interaction) {
    const question = interaction.options.getString("question");
    await interaction.deferReply();

    try {
      const response = await fetch("https://api-inference.huggingface.co/models/gpt2", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.HF_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ inputs: question }),
      });

      const data = await response.json();
      if (!data || !data[0] || !data[0].generated_text) {
        return interaction.editReply("⚠️ AI API returned invalid response.");
      }

      let text = data[0].generated_text;
      const chunks = text.match(/[\s\S]{1,1900}/g) || ["(empty response)"];
      let page = 0;

      const embed = new EmbedBuilder()
        .setTitle("🤖 AI Response")
        .setDescription(chunks[page])
        .setFooter({ text: `Page ${page + 1} / ${chunks.length}` })
        .setColor("Random");

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("prev").setLabel("⬅️").setStyle(ButtonStyle.Primary).setDisabled(true),
        new ButtonBuilder().setCustomId("next").setLabel("➡️").setStyle(ButtonStyle.Primary).setDisabled(chunks.length === 1)
      );

      const msg = await interaction.editReply({ embeds: [embed], components: [row] });

      const collector = msg.createMessageComponentCollector({ time: 60000 });

      collector.on("collect", async (i) => {
        if (i.user.id !== interaction.user.id) {
          return i.reply({ content: "❌ Only the command user can use these buttons!", ephemeral: true });
        }

        if (i.customId === "next" && page < chunks.length - 1) page++;
        if (i.customId === "prev" && page > 0) page--;

        const newEmbed = EmbedBuilder.from(embed)
          .setDescription(chunks[page])
          .setFooter({ text: `Page ${page + 1} / ${chunks.length}` });

        const newRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("prev").setLabel("⬅️").setStyle(ButtonStyle.Primary).setDisabled(page === 0),
          new ButtonBuilder().setCustomId("next").setLabel("➡️").setStyle(ButtonStyle.Primary).setDisabled(page === chunks.length - 1)
        );

        await i.update({ embeds: [newEmbed], components: [newRow] });
      });

      collector.on("end", async () => {
        msg.edit({ components: [] });
      });

    } catch (err) {
      console.error("AI ERROR:", err);
      await interaction.editReply("⚠️ Failed to connect to AI API.");
    }
  },

  // Prefix command
  async run(message, args) {
    const question = args.join(" ");
    if (!question) return message.reply("❌ Please provide a question!");

    const thinkingMsg = await message.reply("🤔 Thinking...");

    try {
      const response = await fetch("https://api-inference.huggingface.co/models/gpt2", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.HF_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ inputs: question }),
      });

      const data = await response.json();
      if (!data || !data[0] || !data[0].generated_text) {
        return thinkingMsg.edit("⚠️ AI API returned invalid response.");
      }

      let text = data[0].generated_text;
      const chunks = text.match(/[\s\S]{1,1900}/g) || ["(empty response)"];
      let page = 0;

      const embed = new EmbedBuilder()
        .setTitle("💫 AI Response")
        .setDescription(chunks[page])
        .setFooter({ text: `Page ${page + 1} / ${chunks.length}` })
        .setColor("Random");

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("prev").setLabel("⬅️").setStyle(ButtonStyle.Primary).setDisabled(true),
        new ButtonBuilder().setCustomId("next").setLabel("➡️").setStyle(ButtonStyle.Primary).setDisabled(chunks.length === 1)
      );

      const msg = await thinkingMsg.edit({ content: " ", embeds: [embed], components: [row] });

      const collector = msg.createMessageComponentCollector({ time: 60000 });

      collector.on("collect", async (i) => {
        if (i.user.id !== message.author.id) {
          return i.reply({ content: "❌ Only the command user can use these buttons!", ephemeral: true });
        }

        if (i.customId === "next" && page < chunks.length - 1) page++;
        if (i.customId === "prev" && page > 0) page--;

        const newEmbed = EmbedBuilder.from(embed)
          .setDescription(chunks[page])
          .setFooter({ text: `Page ${page + 1} / ${chunks.length}` });

        const newRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("prev").setLabel("⬅️").setStyle(ButtonStyle.Primary).setDisabled(page === 0),
          new ButtonBuilder().setCustomId("next").setLabel("➡️").setStyle(ButtonStyle.Primary).setDisabled(page === chunks.length - 1)
        );

        await i.update({ embeds: [newEmbed], components: [newRow] });
      });

      collector.on("end", async () => {
        msg.edit({ components: [] });
      });

    } catch (err) {
      console.error("AI ERROR:", err);
      await thinkingMsg.edit("⚠️ Failed to connect to AI API.");
    }
  },
};
