const {
  SlashCommandBuilder,
  PermissionsBitField,
} = require("discord.js");
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const https = require("https");

const TMP_DIR = "/tmp";
const FFMPEG_PATH = path.join(TMP_DIR, "ffmpeg");
const MAX_DIM = 320;
const MAX_SIZE = 512 * 1024;

// ✅ Ensure ffmpeg exists
async function ensureFFmpeg() {
  if (fs.existsSync(FFMPEG_PATH)) return FFMPEG_PATH;
  console.log("🔽 Downloading ffmpeg binary...");

  const url =
    "https://github.com/eugeneware/ffmpeg-static/releases/download/b4.4.0/ffmpeg-linux-x64";

  await new Promise((resolve, reject) => {
    const file = fs.createWriteStream(FFMPEG_PATH);
    https
      .get(url, (response) => {
        response.pipe(file);
        file.on("finish", () => {
          file.close();
          fs.chmodSync(FFMPEG_PATH, "755");
          console.log("✅ ffmpeg installed!");
          resolve();
        });
      })
      .on("error", (err) => reject(err));
  });

  return FFMPEG_PATH;
}

// ✅ Compress to meet Discord sticker size limit
async function compressToLimit(inputBuffer, outputPath) {
  let quality = 90;
  let buffer = inputBuffer;

  while (true) {
    const resized = await sharp(buffer)
      .resize(MAX_DIM, MAX_DIM, { fit: "inside" })
      .webp({ quality })
      .toBuffer();

    if (resized.length <= MAX_SIZE || quality <= 30) {
      fs.writeFileSync(outputPath, resized);
      return resized;
    }
    quality -= 10;
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("stealsticker")
    .setDescription("Steal an image, sticker, or GIF and add it to your server.")
    .addStringOption((opt) =>
      opt.setName("serverid").setDescription("Server ID to upload to").setRequired(false)
    )
    .addStringOption((opt) =>
      opt.setName("source").setDescription("Sticker ID or image URL").setRequired(false)
    ),

  async execute(context) {
    const { interaction, message, isPrefix, client } = context;

    // 🔁 Safe reply method
    const reply = async (content) => {
      try {
        if (isPrefix && message?.reply) return await message.reply(content);
        if (interaction?.replied || interaction?.deferred)
          return await interaction.followUp(content);
        if (interaction?.reply) return await interaction.reply(content);
      } catch (err) {
        console.error("Reply error:", err);
      }
    };

    const args = isPrefix ? message.content.split(" ").slice(1) : [];
    const serverId = isPrefix ? args[0] : interaction.options.getString("serverid");
    const source = isPrefix ? args[1] : interaction.options.getString("source");

    const guild = serverId
      ? client.guilds.cache.get(serverId)
      : isPrefix
      ? message.guild
      : interaction.guild;

    if (!guild)
      return reply({ content: "⚠️ Couldn’t find that server. Is the bot in it?" });
    if (
      !guild.members.me.permissions.has(PermissionsBitField.Flags.ManageEmojisAndStickers)
    )
      return reply({ content: "❌ I need **Manage Stickers** permission in that server!" });

    if (!source)
      return reply({ content: "⚠️ Please provide a valid sticker ID or image URL!" });

    let progressMsg = await reply({ content: "🔸🔹▪️ **Downloading image/sticker...**" });

    try {
      await ensureFFmpeg();

      let imageBuffer;
      let isGif = false;
      let stickerName = `sticker_${Date.now()}`;

      if (/^https?:\/\//.test(source)) {
        const res = await fetch(source);
        const type = res.headers.get("content-type") || "";
        if (type.includes("gif")) isGif = true;
        imageBuffer = Buffer.from(await res.arrayBuffer());
      } else {
        const sticker = client.stickers.cache.get(source);
        if (!sticker)
          return reply({ content: "⚠️ Invalid sticker ID or URL!" });

        const res = await fetch(sticker.url);
        imageBuffer = Buffer.from(await res.arrayBuffer());
        stickerName = sticker.name;
        if (sticker.format === 2) isGif = true;
      }

      const inputPath = path.join(TMP_DIR, `${stickerName}${isGif ? ".gif" : ".png"}`);
      const outputPath = path.join(TMP_DIR, `${stickerName}.webp`);
      fs.writeFileSync(inputPath, imageBuffer);

      // 🔄 Update progress
      if (progressMsg?.edit)
        await progressMsg.edit({ content: "⚙️ **Processing and resizing image...**" });

      if (isGif) {
        await new Promise((resolve, reject) => {
          exec(
            `"${FFMPEG_PATH}" -i "${inputPath}" -vf "scale=${MAX_DIM}:${MAX_DIM}:force_original_aspect_ratio=decrease" -loop 0 -an -vsync 0 "${outputPath}"`,
            (error) => (error ? reject(error) : resolve())
          );
        });
      } else {
        await compressToLimit(imageBuffer, outputPath);
      }

      const stats = fs.statSync(outputPath);
      if (stats.size > MAX_SIZE)
        return progressMsg.edit({
          content: "❌ Couldn’t compress file under Discord’s 512KB limit!",
        });

      // 🔼 Uploading
      if (progressMsg?.edit)
        await progressMsg.edit({ content: "🚀 **Uploading sticker to Discord...**" });

      const sticker = await guild.stickers.create({
        file: outputPath,
        name: stickerName,
        tags: "fun, custom, sticker",
      });

      await progressMsg.edit({
        content: `✅ **Sticker added successfully!**\n📍 Name: **${sticker.name}**\n🏠 Server: **${guild.name}**\n🔗 ${sticker.url}`,
      });

      fs.unlinkSync(inputPath);
      fs.unlinkSync(outputPath);
    } catch (err) {
      console.error("Sticker creation error:", err);
      progressMsg.edit({ content: `❌ Error: ${err.message}` }).catch(() => {});
    }
  },
};
