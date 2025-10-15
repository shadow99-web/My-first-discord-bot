// ask-ai.js
const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// ✅ Correct SDK initialization
const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

module.exports = {
  name: "ask",
  description: "Ask Gemini 2.0 anything (auto paginates if answer is long)",
  data: new SlashCommandBuilder()
    .setName("ask")
    .setDescription("Ask Gemini 2.0 anything")
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
      const msg = "❌ Please provide a question!";
      return isSlash
        ? context.interaction.reply({ content: msg, ephemeral: true })
        : context.message.reply(msg);
    }

    if (isSlash) await context.interaction.deferReply();
    else await context.message.channel.sendTyping();

    let aiText = "❌ Sorry, Gemini didn’t respond.";

    try {
      // ✅ Correct Gemini API call
      const model = ai.getGenerativeModel({ model: "gemini-2.0-flash" });
      const result = await model.generateContent(question);
      aiText = result.response.text() || "❌ No response text found.";
    } catch (err) {
      aiText = `❌ Error: ${err.message}`;
      console.error("Gemini error:", err);
    }

    const chunks = aiText.match(/[\s\S]{1,1900}/g) || ["(no response)"];
    let page = 0;

    const makeEmbed = () =>
      new EmbedBuilder()
        .setTitle("♡𝚂𝙷𝙰𝙳𝙾𝚆 𝚁𝙴𝚂𝙿𝙾𝙽𝚂𝙴 ✔️")
        .setDescription(chunks[page])
        .setColor(0x00a67e)
        .setFooter({ text: `Page ${page + 1}/${chunks.length}` });

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

    collector.on("collect", async (i) => {
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
