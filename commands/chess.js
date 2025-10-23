// chess.js
const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const { Chess } = require("chess.js");

// In-memory active games (messageId -> gameState). You can migrate to DB if needed.
const activeGames = new Map();

// Unicode piece icons
const pieceIcons = {
  p: "♟️", r: "♜", n: "♞", b: "♝", q: "♛", k: "♚",
  P: "♙", R: "♖", N: "♘", B: "♗", Q: "♕", K: "♔"
};

function squareIndexToCoords(i) {
  // i: 0..63 -> a8..h1
  const rank = 8 - Math.floor(i / 8);
  const file = String.fromCharCode(97 + (i % 8)); // a..h
  return `${file}${rank}`;
}

function coordsToIndex(square) {
  if (!/^[a-h][1-8]$/.test(square)) return -1;
  const file = square.charCodeAt(0) - 97;
  const rank = 8 - parseInt(square[1], 10);
  return rank * 8 + file;
}

function renderBoard(chess, cursorIndex = -1, selectedIndex = -1) {
  // Return a string board: 8 lines
  const board = chess.board();
  let out = "";
  for (let r = 0; r < 8; r++) {
    const row = board[r];
    for (let c = 0; c < 8; c++) {
      const idx = r * 8 + c;
      const sq = row[c];
      let cell = "▫️"; // empty cell icon
      if (sq) {
        const key = sq.color === "w" ? sq.type.toUpperCase() : sq.type;
        cell = pieceIcons[key] || (sq.type);
      }
      if (idx === selectedIndex) {
        // selected square highlight
        cell = `🟩`; // visually show selection — we will append piece after
        if (sq) cell = `🟩${pieceIcons[sq.color === "w" ? sq.type.toUpperCase() : sq.type]}`;
      } else if (idx === cursorIndex) {
        // cursor highlight
        cell = `🟦`;
        if (sq) cell = `🟦${pieceIcons[sq.color === "w" ? sq.type.toUpperCase() : sq.type]}`;
      } else {
        // keep original cell
      }
      // to keep consistent widths, append a space
      // if we used a two-char emoji like 🟦♙ it's fine.
      out += cell + " ";
    }
    out += `\n`;
  }
  // below board show labels
  out += `\nFiles: a b c d e f g h\n`;
  return out;
}

function makeBoardEmbed(chess, whiteId, blackId, currentPlayerId, cursorIndex, selectedIndex) {
  const title = `♟️ Chess — ${chess.turn() === "w" ? "White" : "Black"} to move`;
  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(renderBoard(chess, cursorIndex, selectedIndex))
    .addFields(
      { name: "White", value: `<@${whiteId}>`, inline: true },
      { name: "Black", value: `<@${blackId}>`, inline: true },
      { name: "Turn", value: `<@${currentPlayerId}>`, inline: true }
    )
    .setColor("Blue")
    .setFooter({ text: `Use arrows to move cursor, Select to pick source/destination. Timeout 90s per move.` })
    .setTimestamp();
  return embed;
}

function getControlRows(disabled = false) {
  const navRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("left").setLabel("◀️").setStyle(ButtonStyle.Secondary).setDisabled(disabled),
    new ButtonBuilder().setCustomId("up").setLabel("⬆️").setStyle(ButtonStyle.Secondary).setDisabled(disabled),
    new ButtonBuilder().setCustomId("select").setLabel("✅ Select").setStyle(ButtonStyle.Primary).setDisabled(disabled),
    new ButtonBuilder().setCustomId("down").setLabel("⬇️").setStyle(ButtonStyle.Secondary).setDisabled(disabled),
    new ButtonBuilder().setCustomId("right").setLabel("▶️").setStyle(ButtonStyle.Secondary).setDisabled(disabled)
  );

  const actionRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("undo").setLabel("↩️ Undo").setStyle(ButtonStyle.Secondary).setDisabled(disabled),
    new ButtonBuilder().setCustomId("confirm").setLabel("🟢 Confirm").setStyle(ButtonStyle.Success).setDisabled(disabled),
    new ButtonBuilder().setCustomId("resign").setLabel("🏳️ Resign").setStyle(ButtonStyle.Danger).setDisabled(disabled),
    new ButtonBuilder().setCustomId("cancel").setLabel("❌ Cancel").setStyle(ButtonStyle.Secondary).setDisabled(disabled)
  );

  return [navRow, actionRow];
}

module.exports = {
  name: "chess",
  description: "Play chess with another user (buttons + cursor).",
  data: new SlashCommandBuilder()
    .setName("chess")
    .setDescription("Play chess with another user")
    .addUserOption(o => o.setName("opponent").setDescription("Your opponent").setRequired(true)),

  // execute receives your framework object
  async execute({ client, interaction, message, args, isPrefix, safeReply }) {
    // unify reply helper
    const caller = isPrefix ? message.author : interaction.user;
    const reply = async (options) => {
      if (isPrefix) return message.channel.send(options);
      if (safeReply) return safeReply(options);
      return interaction.reply({ ...options, ephemeral: options.ephemeral ?? false });
    };

    // resolve opponent
    let opponent;
    if (isPrefix) {
      opponent = message.mentions.users.first() || client.users.cache.get(args[0]);
    } else {
      opponent = interaction.options.getUser("opponent");
    }

    if (!opponent) return reply({ content: "❌ You must mention an opponent." });
    if (opponent.bot) return reply({ content: "❌ You can't play against a bot." });
    if (opponent.id === caller.id) return reply({ content: "❌ You cannot play against yourself." });

    // determine who is white/black: challenger = white
    const whiteId = caller.id;
    const blackId = opponent.id;
    const chess = new Chess();

    // initial cursor at e2 for white or e7 for black
    const initialCursor = coordsToIndex(chess.turn() === "w" ? "e2" : "e7");

    // game state stored per message
    const state = {
      chess,
      whiteId,
      blackId,
      currentPlayerId: whiteId,
      cursor: initialCursor,
      selected: -1, // when player selects source becomes index
      messageRef: null,
      lastMoveSAN: null,
    };

    // send initial embed
    const embed = makeBoardEmbed(chess, whiteId, blackId, state.currentPlayerId, state.cursor, state.selected);

    // send via appropriate method
    let sent;
    if (isPrefix) {
      sent = await message.channel.send({ embeds: [embed], components: getControlRows(false) });
    } else {
      await interaction.deferReply();
      sent = await interaction.editReply({ embeds: [embed], components: getControlRows(false), fetchReply: true });
    }

    // save game keyed by message id
    activeGames.set(sent.id, state);
    state.messageRef = sent;

    // create collector
    const collector = sent.createMessageComponentCollector({ time: 90_000 });

    // helper to update embed
    const updateMessage = async (reason) => {
      const e = makeBoardEmbed(state.chess, state.whiteId, state.blackId, state.currentPlayerId, state.cursor, state.selected);
      if (reason) e.setFooter({ text: reason });
      try {
        await sent.edit({ embeds: [e], components: getControlRows(false) });
      } catch (err) { /* ignore */ }
    };

    // movement helpers
    const moveCursor = (dir) => {
      let r = Math.floor(state.cursor / 8);
      let c = state.cursor % 8;
      if (dir === "left") c = Math.max(0, c - 1);
      if (dir === "right") c = Math.min(7, c + 1);
      if (dir === "up") r = Math.max(0, r - 1);
      if (dir === "down") r = Math.min(7, r + 1);
      state.cursor = r * 8 + c;
    };

    collector.on("collect", async (btn) => {
      try {
        // only allow players (white or black) to interact; but only current player may move
        const userId = btn.user.id;
        const turnColor = state.chess.turn() === "w" ? "w" : "b";
        const expectedPlayer = (turnColor === "w") ? state.whiteId : state.blackId;

        // Quick check: only game players can click (viewers prevented)
        if (![state.whiteId, state.blackId].includes(userId)) {
          return btn.reply({ content: "❌ You're not part of this game.", ephemeral: true });
        }

        // allow viewer to press resign if they're the opponent? only current player allowed to control except resign
        if (btn.customId === "resign") {
          if (userId !== state.whiteId && userId !== state.blackId) {
            return btn.reply({ content: "❌ Only players can resign.", ephemeral: true });
          }
          collector.stop("resigned");
          const winner = userId === state.whiteId ? state.blackId : state.whiteId;
          await sent.edit({
            embeds: [new EmbedBuilder().setTitle("🏳️ Resignation").setDescription(`<@${userId}> resigned. <@${winner}> wins!`).setColor("Red")],
            components: []
          });
          return;
        }

        // Only current player can use navigation/select/confirm/undo/cancel
        if (userId !== expectedPlayer) {
          return btn.reply({ content: "❌ It's not your turn.", ephemeral: true });
        }

        // defer update quickly to avoid "This interaction failed"
        await btn.deferUpdate();

        if (["left","right","up","down"].includes(btn.customId)) {
          moveCursor(btn.customId);
          await updateMessage();
          return;
        }

        if (btn.customId === "select") {
          // If nothing selected => select source if piece of player's color exists
          if (state.selected === -1) {
            const sq = squareIndexToCoords(state.cursor);
            const piece = state.chess.get(sq);
            if (!piece || (piece.color !== (state.chess.turn() === "w" ? "w" : "b"))) {
              // invalid select
              await sent.edit({ embeds: [makeBoardEmbed(state.chess, state.whiteId, state.blackId, state.currentPlayerId, state.cursor, -1)] });
              try { await btn.followUp({ content: "❌ You must select one of your pieces as source.", ephemeral: true }); } catch {}
              return;
            }
            state.selected = state.cursor;
            await updateMessage("Source selected. Move cursor to destination and press Select again.");
            return;
          } else {
            // selected exists -> attempt the move from selected to cursor
            const from = squareIndexToCoords(state.selected);
            const to = squareIndexToCoords(state.cursor);
            const move = state.chess.move({ from, to, promotion: "q" });
            if (!move) {
              // invalid move
              state.selected = -1;
              await updateMessage("❌ Invalid move. Selection cleared.");
              try { await btn.followUp({ content: "❌ That move is illegal.", ephemeral: true }); } catch {}
              return;
            }

            // successful move
            state.lastMoveSAN = move.san;
            state.selected = -1;
            // switch player automatically by chess.js turn state
            state.currentPlayerId = state.chess.turn() === "w" ? state.whiteId : state.blackId;

            // check game end states
            if (state.chess.isCheckmate()) {
              collector.stop("checkmate");
              await sent.edit({
                embeds: [new EmbedBuilder().setTitle("🏆 Checkmate!").setDescription(renderBoard(state.chess)).addFields({ name: "Winner", value: `<@${btn.user.id}>` }).setColor("Gold")],
                components: []
              });
              return;
            }
            if (state.chess.isDraw() || state.chess.isStalemate() || state.chess.isInsufficientMaterial()) {
              collector.stop("draw");
              await sent.edit({
                embeds: [new EmbedBuilder().setTitle("🤝 Draw").setDescription(renderBoard(state.chess)).setColor("Grey")],
                components: []
              });
              return;
            }

            // update message with new board
            await updateMessage(`Move: ${state.lastMoveSAN}`);
            return;
          }
        }

        if (btn.customId === "undo") {
          if (state.chess.history().length === 0) {
            try { await btn.followUp({ content: "❌ Nothing to undo.", ephemeral: true }); } catch {}
            return;
          }
          const undone = state.chess.undo();
          state.currentPlayerId = state.chess.turn() === "w" ? state.whiteId : state.blackId;
          state.selected = -1;
          await updateMessage(`Undone: ${undone ? undone.san : "?"}`);
          return;
        }

        if (btn.customId === "confirm") {
          // confirm is redundant here, but keep for workflows where manual confirm desired
          await btn.followUp({ content: "✅ Confirm pressed.", ephemeral: true });
          return;
        }

        if (btn.customId === "cancel") {
          collector.stop("cancel");
          await sent.edit({ content: "❌ Game cancelled.", components: [] }).catch(() => {});
          return;
        }

      } catch (err) {
        console.error("Chess collect error:", err);
      }
    });

    collector.on("end", async (_, reason) => {
      activeGames.delete(sent.id);
      // if ended by inactivity
      if (reason === "time") {
        try {
          await sent.edit({ content: "⏰ Game ended due to inactivity.", components: [] }).catch(() => {});
        } catch {}
      }
    });

    // return command finished
    return;
  },
};
