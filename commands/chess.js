const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder,
} = require("discord.js");
const { Chess } = require("chess.js");
const { createCanvas, loadImage } = require("@napi-rs/canvas");
const path = require("path");
const fs = require("fs");

const games = new Map();

// =============================
// 🧩 Render Chess Board
// =============================
async function renderBoard(chess) {
  const tileSize = 80;
  const canvas = createCanvas(tileSize * 8, tileSize * 8);
  const ctx = canvas.getContext("2d");

  // Draw squares
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      ctx.fillStyle = (x + y) % 2 === 0 ? "#EEEED2" : "#769656";
      ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
    }
  }

  // Draw pieces
  const board = chess.board();
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const sq = board[r][c];
      if (!sq) continue;
      const code = `${sq.color}${sq.type}`;
      const imgPath = path.join(__dirname, "..", "assets", "chess", `${code}.png`);
      if (fs.existsSync(imgPath)) {
        const img = await loadImage(imgPath);
        ctx.drawImage(img, c * tileSize, r * tileSize, tileSize, tileSize);
      }
    }
  }

  return canvas.toBuffer("image/png");
}

// =============================
// 🎯 Generate Move Buttons
// =============================
function moveButtons(moves) {
  const rows = [];
  const perRow = 5;

  for (let i = 0; i < moves.length; i += perRow) {
    const slice = moves.slice(i, i + perRow);
    const row = new ActionRowBuilder();
    slice.forEach((m) => {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`move_${m.to}`)
          .setLabel(m.to)
          .setStyle(ButtonStyle.Primary)
      );
    });
    rows.push(row);
  }

  rows.push(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("cancel")
        .setLabel("❌ Cancel")
        .setStyle(ButtonStyle.Danger)
    )
  );
  return rows;
}

// =============================
// ♟️ Chess Command
// =============================
module.exports = {
  name: "chess",
  description: "Play chess with another user (slash + prefix supported).",
  data: new SlashCommandBuilder()
    .setName("chess")
    .setDescription("Play chess with another user")
    .addUserOption((opt) =>
      opt.setName("opponent").setDescription("Choose your opponent").setRequired(true)
    ),

  async execute({ client, interaction, message, args, isPrefix, safeReply }) {
    const author = isPrefix ? message.author : interaction.user;
    const opponent = isPrefix
      ? message.mentions.users.first() || client.users.cache.get(args[0])
      : interaction.options.getUser("opponent");

    const reply = async (opt) =>
      isPrefix
        ? message.channel.send(opt)
        : safeReply
        ? safeReply(opt)
        : interaction.reply(opt);

    if (!opponent)
      return reply({ content: "❌ Please mention or provide a valid opponent!" });
    if (opponent.bot) return reply({ content: "🤖 You can’t play against bots." });
    if (opponent.id === author.id)
      return reply({ content: "🚫 You can’t play against yourself!" });

    // Game setup
    const chess = new Chess();
    const state = {
      white: author.id,
      black: opponent.id,
      turn: author.id,
      chess,
      selectedSquare: null,
    };

    // Render first board
    const buf = await renderBoard(chess);
    const attachment = new AttachmentBuilder(buf, { name: "board.png" });
    const embed = new EmbedBuilder()
      .setTitle("♟️ Chess Game Started!")
      .setDescription(`**White:** <@${author.id}>\n**Black:** <@${opponent.id}>`)
      .setImage("attachment://board.png")
      .setColor("Blue");

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("select")
        .setLabel("🎯 Select Piece")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("resign")
        .setLabel("🏳️ Resign")
        .setStyle(ButtonStyle.Danger)
    );

    const sent = await reply({ embeds: [embed], files: [attachment], components: [buttons] });
    const msg = isPrefix ? sent : await interaction.fetchReply();
    games.set(msg.id, state);

    // Collector setup
    const collector = msg.createMessageComponentCollector({ time: 300000 });

    collector.on("collect", async (btn) => {
      const userId = btn.user.id;
      const game = games.get(msg.id);
      if (!game) return;

      const btnSafeReply = async (opts) => {
        try {
          if (btn.replied) return await btn.followUp({ ...opts, ephemeral: true }).catch(() => {});
          if (btn.deferred) return await btn.editReply(opts).catch(() => {});
          return await btn.reply({ ...opts, ephemeral: true }).catch(() => {});
        } catch (e) {
          console.error("Button safe reply failed:", e);
        }
      };

      const turnColor = game.chess.turn();
      const expectedPlayer = turnColor === "w" ? game.white : game.black;

      if (userId !== expectedPlayer)
        return btnSafeReply({ content: "❌ It's not your turn!" });

      // Resign
      if (btn.customId === "resign") {
        collector.stop("resign");
        const embed = new EmbedBuilder()
          .setTitle("🏳️ Resigned!")
          .setDescription(
            `<@${userId}> resigned. <@${
              expectedPlayer === game.white ? game.black : game.white
            }> wins!`
          )
          .setColor("Red");
        return msg.edit({ embeds: [embed], components: [] });
      }

      // Select piece
      if (btn.customId === "select") {
        await btnSafeReply({
          content: "Type the square (like `e2`) of the piece you want to move in chat.",
        });

        const filter = (m) => m.author.id === userId;
        const collected = await btn.channel
          .awaitMessages({ filter, max: 1, time: 30000 })
          .catch(() => null);
        const squareMsg = collected?.first();
        if (!squareMsg) return;

        const square = squareMsg.content.trim().toLowerCase();
        const piece = game.chess.get(square);
        if (!piece || piece.color !== turnColor)
          return btnSafeReply({ content: "❌ Invalid piece selection." });

        const validMoves = game.chess.moves({ square, verbose: true });
        if (validMoves.length === 0)
          return btnSafeReply({ content: "No valid moves for that piece." });

        game.selectedSquare = square;
        return btnSafeReply({
          content: `Select a move for **${square}**`,
          components: moveButtons(validMoves),
        });
      }

      // Move handler
      if (btn.customId.startsWith("move_")) {
        const to = btn.customId.replace("move_", "");
        const from = game.selectedSquare;
        if (!from) return btnSafeReply({ content: "No piece selected." });

        const move = game.chess.move({ from, to, promotion: "q" });
        if (!move) return btnSafeReply({ content: "❌ Invalid move." });

        game.selectedSquare = null;
        game.turn = userId === game.white ? game.black : game.white;

        const buf = await renderBoard(game.chess);
        const attachment = new AttachmentBuilder(buf, { name: "board.png" });
        const embed = new EmbedBuilder()
          .setTitle("♟️ Chess Game")
          .setDescription(
            `**White:** <@${game.white}>\n**Black:** <@${game.black}>\n**Turn:** <@${game.turn}>`
          )
          .setImage("attachment://board.png")
          .setColor("Blue");

        if (game.chess.isCheckmate()) {
          collector.stop("checkmate");
          embed.setTitle("🏆 Checkmate!").setDescription(`<@${btn.user.id}> wins!`);
          return msg.edit({ embeds: [embed], files: [attachment], components: [] });
        }

        if (game.chess.isDraw()) {
          collector.stop("draw");
          embed.setTitle("🤝 Draw Game");
          return msg.edit({ embeds: [embed], files: [attachment], components: [] });
        }

        await msg.edit({
          embeds: [embed],
          files: [attachment],
          components: [buttons],
        });
      }

      if (btn.customId === "cancel") {
        await btnSafeReply({ content: "❌ Selection cancelled." });
      }
    });

    collector.on("end", async (_, reason) => {
      if (reason === "time") {
        await msg
          .edit({ content: "⏰ Game ended due to inactivity.", components: [] })
          .catch(() => {});
      }
      games.delete(msg.id);
    });
  },
};
