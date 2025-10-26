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

  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      ctx.fillStyle = (x + y) % 2 === 0 ? "#EEEED2" : "#769656";
      ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
    }
  }

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
// 🎯 Move Buttons
// =============================
function moveButtons(moves) {
  const rows = [];
  const perRow = 5;
  for (let i = 0; i < moves.length; i += perRow) {
    const row = new ActionRowBuilder();
    moves.slice(i, i + perRow).forEach((m) => {
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
// ♟️ Main Command
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
      isPrefix ? message.channel.send(opt) : safeReply(opt);

    if (!opponent)
      return reply({ content: "❌ Please mention or provide a valid opponent!" });
    if (opponent.bot) return reply({ content: "🤖 You can’t play against bots." });
    if (opponent.id === author.id)
      return reply({ content: "🚫 You can’t play against yourself!" });

    const chess = new Chess();
    const game = {
      white: author.id,
      black: opponent.id,
      turn: author.id,
      chess,
      selectedSquare: null,
    };

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

    games.set(msg.id, game);
  },

  // =============================
  // ♟️ Handle Button Interaction
  // =============================
  async handleButton(interaction, client) {
    const msg = interaction.message;
    const id = interaction.customId;
    const game = games.get(msg.id);
    if (!game) return interaction.reply({ content: "❌ Game not found.", ephemeral: true });

    const userId = interaction.user.id;
    const turnColor = game.chess.turn();
    const expectedPlayer = turnColor === "w" ? game.white : game.black;

    const safeReply = async (opt) => {
      try {
        if (interaction.replied) return await interaction.followUp({ ...opt, ephemeral: true });
        if (interaction.deferred) return await interaction.editReply(opt);
        return await interaction.reply({ ...opt, ephemeral: true });
      } catch {}
    };

    if (userId !== expectedPlayer)
      return safeReply({ content: "❌ It's not your turn!" });

    // 🏳️ Resign
    if (id === "resign") {
      games.delete(msg.id);
      const embed = new EmbedBuilder()
        .setTitle("🏳️ Resigned!")
        .setDescription(`<@${userId}> resigned. <@${expectedPlayer === game.white ? game.black : game.white}> wins!`)
        .setColor("Red");
      return msg.edit({ embeds: [embed], components: [] });
    }

    // 🎯 Select piece
    if (id === "select") {
      await safeReply({ content: "Type the square (e.g. `e2`) of the piece you want to move." });
      const filter = (m) => m.author.id === userId;
      const collected = await interaction.channel.awaitMessages({ filter, max: 1, time: 30000 });
      const squareMsg = collected.first();
      if (!squareMsg) return safeReply({ content: "⌛ Timed out." });

      const square = squareMsg.content.trim().toLowerCase();
      const piece = game.chess.get(square);
      if (!piece || piece.color !== turnColor)
        return safeReply({ content: "❌ Invalid piece." });

      const validMoves = game.chess.moves({ square, verbose: true });
      if (validMoves.length === 0)
        return safeReply({ content: "No valid moves for that piece." });

      game.selectedSquare = square;
      return safeReply({ content: `Select a move for **${square}**`, components: moveButtons(validMoves) });
    }

    // 🏁 Move piece
    if (id.startsWith("move_")) {
      const to = id.replace("move_", "");
      const from = game.selectedSquare;
      if (!from) return safeReply({ content: "No piece selected." });

      const move = game.chess.move({ from, to, promotion: "q" });
      if (!move) return safeReply({ content: "❌ Invalid move." });

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
        games.delete(msg.id);
        embed.setTitle("🏆 Checkmate!").setDescription(`<@${interaction.user.id}> wins!`);
        return msg.edit({ embeds: [embed], files: [attachment], components: [] });
      }

      if (game.chess.isDraw()) {
        games.delete(msg.id);
        embed.setTitle("🤝 Draw Game");
        return msg.edit({ embeds: [embed], files: [attachment], components: [] });
      }

      return msg.edit({ embeds: [embed], files: [attachment] });
    }

    if (id === "cancel") {
      await safeReply({ content: "❌ Selection cancelled." });
    }
  },
};
