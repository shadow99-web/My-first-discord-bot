const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

module.exports = {
  // Slash registration (loader expects command.data.name)
  data: new SlashCommandBuilder()
    .setName("ask")
    .setDescription("Ask AI anything!")
    .addStringOption(opt => opt.setName("question").setDescription("Your question for AI").setRequired(true)),

  // (optional) prefix name — your loader uses data.name but keep for clarity
  name: "ask",
  description: "Ask AI anything!",

  /**
   * Unified exec for slash + prefix.
   * Note: interaction.js must pass `safeReply` into command.execute when running slash commands.
   */
  async execute({ client, interaction, message, args, isPrefix, safeReply }) {
    const question = isPrefix ? args.join(" ") : interaction.options.getString("question");
    if (!question) {
      if (isPrefix) return message.reply("❌ Please provide a question!");
      return safeReply
        ? await safeReply({ content: "❌ Please provide a question!", ephemeral: true })
        : await interaction.reply({ content: "❌ Please provide a question!", ephemeral: true });
    }

    try {
      // Use global fetch (Node 18+). No node-fetch import.
      const res = await fetch("https://api-inference.huggingface.co/models/gpt2", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.HF_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ inputs: question }),
      });

      const data = await res.json();

      if (!data || !data[0] || !data[0].generated_text) {
        const failMsg = "⚠️ AI API returned invalid response.";
        if (isPrefix) return message.reply(failMsg);
        return safeReply ? await safeReply({ content: failMsg, ephemeral: true }) : await interaction.reply({ content: failMsg, ephemeral: true });
      }

      let text = data[0].generated_text;
      const chunks = text.match(/[\s\S]{1,1900}/g) || ["(empty response)"];
      let page = 0;

      const makeEmbed = () =>
        new EmbedBuilder()
          .setTitle("🤖 AI Response")
          .setDescription(chunks[page])
          .setFooter({ text: `Page ${page + 1} / ${chunks.length}` })
          .setColor("Random");

      const makeRow = () =>
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("ask_prev")
            .setLabel("⬅️")
            .setStyle(ButtonStyle.Primary)
            .setDisabled(page === 0),
          new ButtonBuilder()
            .setCustomId("ask_next")
            .setLabel("➡️")
            .setStyle(ButtonStyle.Primary)
            .setDisabled(page === chunks.length - 1)
        );

      // Send the message and fetch the Message object for the collector
      let sent;
      if (isPrefix) {
        sent = await message.reply({ embeds: [makeEmbed()], components: [makeRow()] });
      } else {
        // Use safeReply if available (interaction.js provides it). Include fetchReply: true so it returns Message.
        const replyOptions = { embeds: [makeEmbed()], components: [makeRow()], fetchReply: true };
        sent = safeReply ? await safeReply(replyOptions) : await interaction.reply({ ...replyOptions });
      }

      // Collector on the sent message
      const collector = sent.createMessageComponentCollector({ time: 120_000 });

      collector.on("collect", async (i) => {
        // Only allow the original command user to page
        const authorId = isPrefix ? message.author.id : interaction.user.id;
        if (i.user.id !== authorId) {
          return i.reply({ content: "❌ Only the command user can use these buttons!", ephemeral: true });
        }

        if (i.customId === "ask_next" && page < chunks.length - 1) page++;
        if (i.customId === "ask_prev" && page > 0) page--;

        // update the message with new page & buttons
        await i.update({ embeds: [makeEmbed()], components: [makeRow()] }).catch(() => {});
      });

      collector.on("end", async () => {
        try { await sent.edit({ components: [] }); } catch (e) { /* ignore */ }
      });
    } catch (err) {
      console.error("AI ERROR:", err);
      const failMsg = "⚠️ Failed to connect to AI API.";
      if (isPrefix) return message.reply(failMsg);
      return safeReply ? await safeReply({ content: failMsg, ephemeral: true }) : await interaction.reply({ content: failMsg, ephemeral: true });
    }
  },
};
