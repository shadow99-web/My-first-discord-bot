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
    .setDescription("Play Rock Paper Scissors with AI!")
    .addStringOption((option) =>
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
    if (!userChoice || !validChoices.includes(userChoice)) {
      const msg = "❌ Please choose one of: **rock**, **paper**, or **scissors**.";
      if (isSlash)
        return context.interaction.reply({ content: msg, ephemeral: false });
      return context.message.reply(msg);
    }

    if (isSlash) await context.interaction.deferReply();

    const playRPS = async (userPick) => {
      try {
        const res = await fetch(
          `https://rockpaperscissors-ai.vercel.app/api/play?user=${userPick}`
        );
        const data = await res.json();

        const aiChoice = data.ai || "unknown";
        const result = data.result || "Error determining winner";

        const emojis = {
          rock: "🪨",
          paper: "📄",
          scissors: "✂️",
        };

        const embed = new EmbedBuilder()
          .setTitle("🎮 Rock Paper Scissors")
          .setDescription(
            `**You:** ${emojis[userPick]} (${userPick})\n` +
              `**AI:** ${emojis[aiChoice]} (${aiChoice})\n\n` +
              `🧩 **Result:** ${
                result === "win"
                  ? "🎉 You Win!"
                  : result === "lose"
                  ? "😢 You Lose!"
                  : "🤝 It's a Draw!"
              }`
          )
          .setColor("Random")
          .setTimestamp();

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

        return { embed, row };
      } catch (err) {
        console.error("Error fetching RPS result:", err);
        const embed = new EmbedBuilder()
          .setTitle("⚠️ Error")
          .setDescription("AI service unavailable. Try again later!")
          .setColor("Red");
        return { embed, row: null };
      }
    };

    const { embed, row } = await playRPS(userChoice);

    const sent = isSlash
      ? await context.interaction.editReply({
          embeds: [embed],
          components: row ? [row] : [],
        })
      : await context.message.reply({
          embeds: [embed],
          components: row ? [row] : [],
        });

    const collector = sent.createMessageComponentCollector({ time: 120000 });

    collector.on("collect", async (i) => {
      const authorId = isSlash
        ? context.interaction.user.id
        : context.message.author.id;
      if (i.user.id !== authorId)
        return i.reply({
          content: "❌ Only the command invoker can play this game.",
          ephemeral: true,
        });

      const newChoice = i.customId.replace("rps_", "");
      const { embed: newEmbed, row: newRow } = await playRPS(newChoice);
      await i.update({ embeds: [newEmbed], components: [newRow] });
    });

    collector.on("end", () => {
      sent
        .edit({ components: [] })
        .catch(() => {});
    });
  },
};
