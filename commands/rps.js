const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

module.exports = {
  data: new SlashCommandBuilder()
    .setName("rps")
    .setDescription("Play Rock Paper Scissors with AI!")
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

    const valid = ["rock", "paper", "scissors"];
    if (!userChoice || !valid.includes(userChoice)) {
      const msg = "❌ Please choose one of: **rock**, **paper**, or **scissors**.";
      if (isSlash) return context.interaction.reply({ content: msg });
      return context.message.reply(msg);
    }

    if (isSlash) await context.interaction.deferReply();

    // Convert userChoice to the API’s expected format
    const apiChoiceMap = {
      rock: "rockr",
      paper: "paperp",
      scissors: "scissorss",
    };
    const userApiChoice = apiChoiceMap[userChoice];

    let replyEmbed, replyRow;

    try {
      const res = await fetch(`https://rps.gamertike.com/api/${userApiChoice}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const aiChoice = data.computer; // likely values in same style or similar
      const resultWinner = data.winner; // true (you won), false (you lost), or null/draw

      const emojis = {
        rock: "🪨",
        paper: "📄",
        scissors: "✂️",
      };

      const userEm = emojis[userChoice];
      const aiEm = emojis[aiChoice] || aiChoice; // fallback just in case

      let resultText;
      if (resultWinner === true) resultText = "🎉 You Win!";
      else if (resultWinner === false) resultText = "😢 You Lose!";
      else resultText = "🤝 It's a Draw!";

      replyEmbed = new EmbedBuilder()
        .setTitle("🎮 Rock Paper Scissors")
        .setDescription(
          `**You:** ${userEm} (${userChoice})\n` +
          `**AI:** ${aiEm} (${aiChoice})\n\n` +
          `🧩 **Result:** ${resultText}`
        )
        .setColor("Random")
        .setTimestamp();

      // Buttons for play again
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
      replyRow = row;

    } catch (err) {
      console.error("RPS API error:", err);
      replyEmbed = new EmbedBuilder()
        .setTitle("⚠️ Error")
        .setDescription("Could not reach the game server. Try again later!")
        .setColor("Red");
      replyRow = null;
    }

    const sent = isSlash
      ? await context.interaction.editReply({ embeds: [replyEmbed], components: replyRow ? [replyRow] : [] })
      : await context.message.reply({ embeds: [replyEmbed], components: replyRow ? [replyRow] : [] });

    if (!replyRow) return;  // no buttons if API error

    const collector = sent.createMessageComponentCollector({ time: 60000 });

    collector.on("collect", async i => {
      const authorId = isSlash ? context.interaction.user.id : context.message.author.id;
      if (i.user.id !== authorId) {
        return i.reply({ content: "❌ Only you can press this.", ephemeral: true });
      }

      // determine new choice from button id
      const custom = i.customId;
      const newChoice = custom.replace("rps_", "");  // "rock" etc.

      // recursively do it: play again
      // fetch again with newChoice
      // reuse the same logic

      // Might extract to function to avoid duplication
      const apiNewChoice = apiChoiceMap[newChoice];
      let newEmbed, newRow;

      try {
        const res2 = await fetch(`https://rps.gamertike.com/api/${apiNewChoice}`);
        if (!res2.ok) throw new Error(`HTTP ${res2.status}`);
        const data2 = await res2.json();

        const aiChoice2 = data2.computer;
        const result2 = data2.winner;

        const emojis = {
          rock: "🪨",
          paper: "📄",
          scissors: "✂️",
        };

        let resultText2;
        if (result2 === true) resultText2 = "🎉 You Win!";
        else if (result2 === false) resultText2 = "😢 You Lose!";
        else resultText2 = "🤝 It's a Draw!";

        const userEm2 = emojis[newChoice];
        const aiEm2 = emojis[aiChoice2] || aiChoice2;

        newEmbed = new EmbedBuilder()
          .setTitle("🎮 Rock Paper Scissors")
          .setDescription(
            `**You:** ${userEm2} (${newChoice})\n` +
            `**AI:** ${aiEm2} (${aiChoice2})\n\n` +
            `🧩 **Result:** ${resultText2}`
          )
          .setColor("Random")
          .setTimestamp();

        const newRow2 = new ActionRowBuilder().addComponents(
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

        await i.update({ embeds: [newEmbed], components: [newRow2] });
      } catch(err2) {
        console.error("Error on rematch:", err2);
        await i.update({ 
          embeds: [
            new EmbedBuilder()
              .setTitle("⚠️ Error")
              .setDescription("Could not reach the game server. Try again later!")
              .setColor("Red")
          ], 
          components: [] 
        });
      }
    });

    collector.on("end", () => {
      sent.edit({ components: [] }).catch(() => {});
    });
  }
};
