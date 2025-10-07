const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("rps")
    .setDescription("🎮 Play Rock Paper Scissors against AI!")
    .addStringOption(option =>
      option
        .setName("choice")
        .setDescription("Your choice (rock, paper, or scissors)")
        .setRequired(true)
        .addChoices(
          { name: "🪨 Rock", value: "rock" },
          { name: "📄 Paper", value: "paper" },
          { name: "✂️ Scissors", value: "scissors" }
        )
    ),

  async execute(context) {
    const isSlash = !context.isPrefix;
    const userChoice = isSlash
      ? context.interaction.options.getString("choice")
      : context.args?.[0]?.toLowerCase();

    const validChoices = ["rock", "paper", "scissors"];
    if (!validChoices.includes(userChoice)) {
      const msg = "❌ Please choose either **rock**, **paper**, or **scissors**.";
      if (isSlash) return context.interaction.reply({ content: msg });
      return context.message.reply(msg);
    }

    if (isSlash) await context.interaction.deferReply();

    const emojis = {
      rock: "🪨",
      paper: "📄",
      scissors: "✂️",
    };

    // Function to determine winner
    const getResult = (user, ai) => {
      if (user === ai) return "draw";
      if (
        (user === "rock" && ai === "scissors") ||
        (user === "paper" && ai === "rock") ||
        (user === "scissors" && ai === "paper")
      )
        return "win";
      return "lose";
    };

    const getAIChoice = () =>
      validChoices[Math.floor(Math.random() * validChoices.length)];

    const aiChoice = getAIChoice();
    const result = getResult(userChoice, aiChoice);

    const resultText =
      result === "win"
        ? "🎉 You Win!"
        : result === "lose"
        ? "😢 You Lose!"
        : "🤝 It's a Draw!";

    const embed = new EmbedBuilder()
      .setTitle("🎮 Rock Paper Scissors")
      .setDescription(
        `**You:** ${emojis[userChoice]} (${userChoice})\n` +
        `**AI:** ${emojis[aiChoice]} (${aiChoice})\n\n` +
        `🧩 **Result:** ${resultText}`
      )
      .setColor(result === "win" ? 0x57F287 : result === "lose" ? 0xED4245 : 0xFEE75C)
      .setTimestamp();

    // Play again buttons
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("rps_rock")
        .setLabel("🪨 Rock")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("rps_paper")
        .setLabel("📄 Paper")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("rps_scissors")
        .setLabel("✂️ Scissors")
        .setStyle(ButtonStyle.Secondary)
    );

    const sent = isSlash
      ? await context.interaction.editReply({ embeds: [embed], components: [row] })
      : await context.message.reply({ embeds: [embed], components: [row] });

    const collector = sent.createMessageComponentCollector({ time: 60000 });

    collector.on("collect", async (i) => {
      const authorId = isSlash
        ? context.interaction.user.id
        : context.message.author.id;
      if (i.user.id !== authorId)
        return i.reply({ content: "❌ Only the player can click.", ephemeral: true });

      const newChoice = i.customId.replace("rps_", "");
      const newAIChoice = getAIChoice();
      const newResult = getResult(newChoice, newAIChoice);

      const newText =
        newResult === "win"
          ? "🎉 You Win!"
          : newResult === "lose"
          ? "😢 You Lose!"
          : "🤝 It's a Draw!";

      const newEmbed = new EmbedBuilder()
        .setTitle("🎮 Rock Paper Scissors")
        .setDescription(
          `**You:** ${emojis[newChoice]} (${newChoice})\n` +
          `**AI:** ${emojis[newAIChoice]} (${newAIChoice})\n\n` +
          `🧩 **Result:** ${newText}`
        )
        .setColor(
          newResult === "win"
            ? 0x57F287
            : newResult === "lose"
            ? 0xED4245
            : 0xFEE75C
        )
        .setTimestamp();

      await i.update({ embeds: [newEmbed], components: [row] });
    });

    collector.on("end", () => {
      sent.edit({ components: [] }).catch(() => {});
    });
  },
};
