const {
  SlashCommandBuilder,
  EmbedBuilder,
  AttachmentBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const { createCanvas, loadImage } = require("@napi-rs/canvas");
const path = require("path");

const games = new Map();

async function renderCricketFrame(state) {
  const canvas = createCanvas(500, 300);
  const ctx = canvas.getContext("2d");

  const pitch = await loadImage(path.join(__dirname, "..", "assets", "cricket", "pitch.png"));
  const bat = await loadImage(path.join(__dirname, "..", "assets", "cricket", "bat.png"));
  const ball = await loadImage(path.join(__dirname, "..", "assets", "cricket", "ball.png"));

  ctx.drawImage(pitch, 0, 0, 500, 300);

  // Draw bat
  ctx.save();
  ctx.translate(420, 200);
  ctx.rotate((state.batAngle * Math.PI) / 180);
  ctx.drawImage(bat, -30, -80, 80, 160);
  ctx.restore();

  // Draw ball
  ctx.drawImage(ball, state.ballX, state.ballY, 25, 25);

  // Score
  ctx.fillStyle = "white";
  ctx.font = "bold 24px Arial";
  ctx.fillText(`Score: ${state.score}`, 20, 40);

  return canvas.toBuffer("image/png");
}

module.exports = {
  name: "cricket",
  description: "Play Doodle Cricket with live animation!",
  data: new SlashCommandBuilder().setName("cricket").setDescription("Play Doodle Cricket!"),

  async execute({ interaction, message, isPrefix, safeReply }) {
    const user = isPrefix ? message.author : interaction.user;
    const reply = (opt) =>
      isPrefix
        ? message.channel.send(opt)
        : safeReply
        ? safeReply(opt)
        : interaction.reply(opt);

    if (games.has(user.id))
      return reply({ content: "🏏 You already have a game running!", ephemeral: true });

    // Initial state
    const state = {
      userId: user.id,
      score: 0,
      batAngle: 0,
      ballX: 50,
      ballY: 200,
      velocity: 0,
      playing: true,
      hitting: false,
    };
    games.set(user.id, state);

    const buf = await renderCricketFrame(state);
    const attachment = new AttachmentBuilder(buf, { name: "cricket.png" });
    const embed = new EmbedBuilder()
      .setTitle("🏏 Doodle Cricket!")
      .setDescription("Press 🏏 **Bat** at the right time to hit the ball!\n⏱️ Timing matters.")
      .setImage("attachment://cricket.png")
      .setColor("Green");

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("bat").setLabel("🏏 Bat").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("skip").setLabel("⏩ Skip").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("reset").setLabel("🔁 Reset").setStyle(ButtonStyle.Danger)
    );

    const sent = await reply({ embeds: [embed], files: [attachment], components: [buttons] });
    const msg = isPrefix ? sent : await interaction.fetchReply();

    // --- Game loop (ball animation) ---
    const interval = setInterval(async () => {
      const game = games.get(user.id);
      if (!game || !game.playing) return clearInterval(interval);

      // Move ball
      game.ballX += 10;

      // When ball reaches bat zone
      if (game.ballX >= 370 && !game.hitting) {
        game.playing = false; // missed
        await updateBoard(msg, game, buttons, false);
        clearInterval(interval);
      }

      // Update every 200 ms
      const buf = await renderCricketFrame(game);
      const attachment = new AttachmentBuilder(buf, { name: "cricket.png" });
      const embed = new EmbedBuilder()
        .setTitle("🏏 Doodle Cricket!")
        .setDescription(`Score: **${game.score}**`)
        .setImage("attachment://cricket.png")
        .setColor("Green");

      await msg.edit({ embeds: [embed], files: [attachment], components: [buttons] }).catch(() => {});
    }, 200);

    // --- Button collector ---
    const collector = msg.createMessageComponentCollector({ time: 180000 });

    collector.on("collect", async (btn) => {
      const game = games.get(user.id);
      if (!game) return;

      if (btn.user.id !== user.id)
        return btn.reply({ content: "❌ This is not your game!", ephemeral: true });

      if (btn.customId === "bat") {
        game.hitting = true;
        game.batAngle = 45;

        // Detect hit timing
        if (game.ballX > 340 && game.ballX < 420) {
          const run = [1, 2, 4, 6][Math.floor(Math.random() * 4)];
          game.score += run;
          game.ballX = 50;
          game.hitting = false;
          game.batAngle = 0;
        } else {
          game.playing = false; // missed timing
        }

        await updateBoard(msg, game, buttons, true);
      }

      if (btn.customId === "skip") {
        game.ballX = 50;
        game.hitting = false;
        await updateBoard(msg, game, buttons, true);
      }

      if (btn.customId === "reset") {
        Object.assign(game, {
          score: 0,
          batAngle: 0,
          ballX: 50,
          playing: true,
          hitting: false,
        });
        await updateBoard(msg, game, buttons, true);
      }
    });

    collector.on("end", () => {
      clearInterval(interval);
      games.delete(user.id);
    });
  },
};

async function updateBoard(msg, game, buttons, inPlay) {
  const buf = await renderCricketFrame(game);
  const attachment = new AttachmentBuilder(buf, { name: "cricket.png" });

  const embed = new EmbedBuilder()
    .setTitle("🏏 Doodle Cricket!")
    .setDescription(
      game.playing
        ? `Score: **${game.score}**`
        : `💀 Missed the ball!\n**Final Score:** ${game.score}`
    )
    .setImage("attachment://cricket.png")
    .setColor(game.playing ? "Green" : "Red");

  await msg.edit({
    embeds: [embed],
    files: [attachment],
    components: game.playing ? [buttons] : [],
  });
}
