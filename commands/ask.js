// ask-ai.js
const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

// ✅ Correct Gemini SDK import
const { GoogleGenerativeAI } = require("@google/generative-ai");

// ✅ Instantiate with API key
const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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
    
    // Defer reply for slash commands or send typing for message commands
    if (isSlash) {
        await context.interaction.deferReply();
    } else {
        await context.message.channel.sendTyping();
    }

    let aiText = "❌ Sorry, an error occurred or the Gemini API didn't reply.";

    try {
      const model = ai.getGenerativeModel({ model: "gemini-2.0-flash" }); // ✅ correct model name
const result = await model.generateContent(question);
const aiText = result.response.text();
      
      // Simplified response parsing for the modern SDK
      aiText = response.text; 
      
      if (!aiText) {
          aiText = "❌ No useful response from Gemini. The content may have been blocked.";
      }
      
    } catch (err) {
      aiText = `❌ Error: ${err.message?.slice(0, 200) || "Unexpected error."}`;
      // optionally log err for debugging
      console.error("Gemini AI error", err);
    }

    // CRITICAL FIX: Use the correct regex to split the text, including newlines
    // This is the correct pattern to match ANY character (whitespace \s or non-whitespace \S)
    const chunks = aiText.match(/[\s\S]{1,1900}/g) || ["(no response)"];
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
      // Remove buttons when the collector ends (e.g., after 2 minutes)
      sent.edit({ components: [] }).catch(() => {});
    });
  },
};
