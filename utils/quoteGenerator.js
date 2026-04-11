const { createCanvas, loadImage } = require("canvas");

async function generateQuote(user, state) {
  const width = state.landscape ? 900 : 800;
  const height = 400;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // ================= BG =================
  ctx.fillStyle = state.invertBg ? "#ffffff" : "#000000";
  ctx.fillRect(0, 0, width, height);

  // ================= AVATAR PANEL =================
  const avatar = await loadImage(
    user.displayAvatarURL({ extension: "png", size: 512 })
  );

  // Apply filters COMBINED (important)
  let filters = [];
  if (state.blur) filters.push("blur(4px)");
  if (state.brightness) filters.push("brightness(1.4)");
  ctx.filter = filters.join(" ");

  // Big left panel
  ctx.drawImage(avatar, 0, 0, width / 2, height);

  ctx.filter = "none";

  // Dark overlay (Greed style)
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillRect(0, 0, width / 2, height);

  // ================= TEXT =================
  ctx.fillStyle = state.invertBg ? "#000" : "#fff";

  if (state.font === "bold") ctx.font = "bold 40px Arial";
  else if (state.font === "anime") ctx.font = "40px Comic Sans MS";
  else ctx.font = "35px Sans";

  ctx.textAlign = "center";

  const maxWidth = width / 2 - 40;
  const text = state.text || "No text";
  let words = text.split(" ");
  let lines = [];
  let current = "";

  for (let word of words) {
    let test = current + word + " ";
    let w = ctx.measureText(test).width;

    if (w > maxWidth) {
      lines.push(current);
      current = word + " ";
    } else {
      current = test;
    }
  }
  lines.push(current);

  // Flip text (if enabled)
  if (state.flipText) {
    ctx.save();
    ctx.scale(-1, 1);
  }

  lines.forEach((line, i) => {
    const x = state.flipText ? -(width * 0.75) : width * 0.75;
    ctx.fillText(line.trim(), x, 140 + i * 45);
  });

  if (state.flipText) ctx.restore();

  // ================= USER TAG =================
  ctx.font = "20px Sans";
  ctx.fillStyle = "#aaaaaa";

  const tagX = state.flipText ? -(width * 0.75) : width * 0.75;
  ctx.fillText(`@${user.username}`, tagX, height - 40);

  // ================= PIXEL EFFECT =================
  if (state.pixelate) {
    const temp = createCanvas(width / 10, height / 10);
    const tctx = temp.getContext("2d");

    tctx.drawImage(canvas, 0, 0, temp.width, temp.height);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(temp, 0, 0, temp.width, temp.height, 0, 0, width, height);
  }

  return canvas.toBuffer();
}

module.exports = { generateQuote };
