const { createCanvas, loadImage } = require("canvas");

async function generateQuote(user, state) {
  const width = state.landscape ? 800 : 500;
  const height = 300;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // BG
  ctx.fillStyle = state.invertBg ? "#ffffff" : "#000000";
  ctx.fillRect(0, 0, width, height);

  // Avatar
  const avatar = await loadImage(
    user.displayAvatarURL({ extension: "png" })
  );

  if (state.blur) ctx.filter = "blur(5px)";
  if (state.brightness) ctx.filter = "brightness(1.5)";
  if (state.pixelate) ctx.imageSmoothingEnabled = false;

  ctx.drawImage(avatar, 20, 20, 100, 100);
  ctx.filter = "none";

  // Text
  ctx.fillStyle = state.invertBg ? "#000" : "#fff";

  if (state.font === "bold") ctx.font = "30px Arial";
  else if (state.font === "anime") ctx.font = "30px Comic Sans MS";
  else ctx.font = "25px Sans";

  if (state.flipText) {
    ctx.save();
    ctx.scale(-1, 1);
    ctx.fillText(state.text, -width + 150, 200);
    ctx.restore();
  } else {
    ctx.fillText(state.text, 150, 200);
  }

  return canvas.toBuffer();
}

module.exports = { generateQuote };
