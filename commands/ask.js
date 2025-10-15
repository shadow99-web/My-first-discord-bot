// ask-ai.js
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { GoogleGenAI } = require("@google/genai");

// Make sure GEMINI_API_KEY is in your .env or process.env
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

module.exports = {
  name: "ask",
  description: "Ask Gemini 2.5 AI anything (auto paginates if answer is long)",
  data: new SlashCommandBuilder()
    .setName("ask")
    .setDescription("Ask Gemini 2.5 AI anything")
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
      const msg = "❌ Please provide a question!";
      if (isSlash)
        return context.interaction.reply({ content: msg, ephemeral: true });
      else
        return context.message.reply(msg);
    }

    if (isSlash) await context.interaction.deferReply();

    let aiText = "❌ Sorry, an error occurred or the Gemini API didn't reply.";

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash", // update if Google AI Studio shows a different name!
        contents: [{ role: "user", parts: [{ text: question }] }],
      });
      // For new SDKs: Some versions return .text, some .candidates[0].content.parts[0].text
      aiText =
        response?.text ||
        response?.candidates?.[0]?.content?.parts?.[0]?.text ||
        response?.candidates?.[0]?.output_text ||
        "❌ No useful response from Gemini.";
    } catch (err) {
      aiText = `❌ Error: ${err.message?.slice(0, 200) || "Unexpected error."}`;
      // optionally log err for debugging
      console.error("Gemini AI error", err);
    }

    // Paginate if > 1900 chars
    const chunks = aiText.match(/[sS]{1,1900}/g) || ["(no response)"];
    let page = 0;

    const makeEmbed = (desc = chunks[page]) =>
      new EmbedBuilder()
        .setTitle("💬 Gemini 2.5 Response")
        .setDescription(desc)
        .setColor(0x00a67e)
        .setFooter({
          text: `Gemini 2.5 | Page ${page + 1}/${chunks.length}`,
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

    const userId = isSlash
      ? context.interaction.user.id
      : context.message.author.id;

    const collector = sent.createMessageComponentCollector({ time: 120000 });

    collector.on("collect", async i => {
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
