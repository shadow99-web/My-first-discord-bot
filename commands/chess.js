// commands/chess.js
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

async function renderBoard(chess) {
  const tileSize = 80;
  const canvas = createCanvas(tileSize * 8, tileSize * 8);
  const ctx = canvas.getContext("2d");

  // draw background
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      ctx.fillStyle = (x + y) % 2 === 0 ? "#EEEED2" : "#769656";
      ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
    }
  }

  // draw pieces
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

function moveButtons(validMoves) {
  const rows = [];
  const perRow = 5;
  for (let i = 0; i < validMoves.length; i += perRow) {
    const slice = validMoves.slice(i, i + perRow);
    const row = new ActionRowBuilder();
    slice.forEach(m => {
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

module.exports = {
  name: "chess",
  description: "Play chess with another user (visual board + valid moves).",
  data: new SlashCommandBuilder()
    .setName("chess")
    .setDescription("Play chess with another user")
    .addUserOption(o => o.setName("opponent").setDescription("Your opponent").setRequired(true)),

  async execute({ client, interaction, message, args, isPrefix, safeReply }) {
    const author = isPrefix ? message.author : interaction.user;
    const opponent = isPrefix
      ? message.mentions.users.first() || client.users.cache.get(args[0])
      : interaction.options.getUser("opponent");

    const reply = async (opt) =>
      isPrefix ? message.channel.send(opt) :
      safeReply ? safeReply(opt) :
      interaction.reply(opt);

    if (!opponent) return reply({ content: "❌ Mention an opponent." });
    if (opponent.bot) return reply({ content: "❌ You can’t play against bots." });
    if (opponent.id === author.id) return reply({ content: "❌ You can’t play yourself." });

    const chess = new Chess();
    const state = {
      white: author.id,
      black: opponent.id,
      turn: author.id,
      chess,
    };

    const buf = await renderBoard(chess);
    const attachment = new AttachmentBuilder(buf, { name: "board.png" });
    const embed = new EmbedBuilder()
      .setTitle("♟️ Chess Game Started!")
      .setDescription(`**White:** <@${author.id}>\n**Black:** <@${opponent.id}>`)
      .setImage("attachment://board.png")
      .setColor("Blue");

    const sent = await reply({ embeds: [embed], files: [attachment] });
    const msg = isPrefix ? sent : await interaction.fetchReply();
    games.set(msg.id, state);

    const collector = msg.createMessageComponentCollector({ time: 90_000 });

    collector.on("collect", async (btn) => {
      const userId = btn.user.id;
      const game = games.get(msg.id);
      if (!game) return btn.reply({ content: "Game not found.", ephemeral: true });

      const turnColor = game.chess.turn();
      const expectedPlayer = turnColor === "w" ? game.white : game.black;
      if (userId !== expectedPlayer)
        return btn.reply({ content: "❌ Not your turn!", ephemeral: true });

      if (btn.customId === "cancel") {
        collector.stop("cancel");
        await btn.update({ content: "Game cancelled.", components: [] });
        return;
      }

      // first click: piece selection
      if (!game.selected) {
        const square = btn.customId.replace("move_", "");
        const piece = game.chess.get(square);
        if (!piece || piece.color !== turnColor)
          return btn.reply({ content: "Select one of your pieces.", ephemeral: true });

        const validMoves = game.chess.moves({ square, verbose: true });
        if (validMoves.length === 0)
          return btn.reply({ content: "No valid moves for that piece.", ephemeral: true });

        game.selected = square;
        await btn.update({ content: `Select move for **${square}**`, components: moveButtons(validMoves) });
        return;
      }

      // second click: destination
      const to = btn.customId.replace("move_", "");
      const from = game.selected;
      const move = game.chess.move({ from, to, promotion: "q" });

      if (!move) return btn.reply({ content: "Invalid move.", ephemeral: true });

      game.selected = null;
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
        return btn.update({ embeds: [embed], files: [attachment], components: [] });
      }

      if (game.chess.isDraw()) {
        collector.stop("draw");
        embed.setTitle("🤝 Draw Game");
        return btn.update({ embeds: [embed], files: [attachment], components: [] });
      }

      await btn.update({ embeds: [embed], files: [attachment], components: [] });
    });

    collector.on("end", async (_, reason) => {
      if (reason === "time") {
        await msg.edit({ content: "⏰ Game ended due to inactivity.", components: [] }).catch(() => {});
      }
      games.delete(msg.id);
    });
  },
};
