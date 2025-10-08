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

// ✅ Download ffmpeg binary (Render safe)
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
      .on("error", reject);
  });

  return FFMPEG_PATH;
}

// ✅ Compress image below Discord sticker limit
async function compressToLimit(inputBuffer, outputPath) {
  let quality = 90;
  while (true) {
    const resized = await sharp(inputBuffer)
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
    .setDescription("Steal an image/sticker/GIF and upload it as a sticker (cross-server supported)")
    .addStringOption((opt) =>
      opt.setName("serverid").setDescription("Target server ID to upload to").setRequired(false)
    )
    .addStringOption((opt) =>
      opt.setName("source").setDescription("Sticker ID or image URL").setRequired(false)
    ),

  async execute(context) {
    const { interaction, message, isPrefix, client } = context;

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

    // 🧠 Handle args
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

    // 🔍 Try getting attachment/sticker/URL
    let imageURL = source;
    if (!imageURL && message?.reference) {
      const repliedMsg = await message.channel.messages.fetch(message.reference.messageId);
      if (repliedMsg?.attachments.size > 0)
        imageURL = repliedMsg.attachments.first().url;
      else if (repliedMsg?.stickers.size > 0)
        imageURL = repliedMsg.stickers.first().url;
    }

    if (!imageURL)
      return reply({
        content:
          "⚠️ Please provide a valid URL, sticker ID, or reply to an image/sticker!",
      });

    let progressMsg = await reply({
      content: "🔹 Downloading image/sticker...",
    });

    try {
      await ensureFFmpeg();

      // 🧾 Fetch image data
      let res;
      if (/^https?:\/\//.test(imageURL)) {
        res = await fetch(imageURL);
      } else {
        const sticker = client.stickers.cache.get(imageURL);
        if (!sticker)
          return progressMsg.edit({ content: "⚠️ Invalid sticker ID!" });
        res = await fetch(sticker.url);
      }

      const type = res.headers.get("content-type") || "";
      const isGif = type.includes("gif");
      const buffer = Buffer.from(await res.arrayBuffer());

      const stickerName = `sticker_${Date.now()}`;
      const inputPath = path.join(TMP_DIR, `${stickerName}${isGif ? ".gif" : ".png"}`);
      const outputPath = path.join(TMP_DIR, `${stickerName}.webp`);
      fs.writeFileSync(inputPath, buffer);

      await progressMsg.edit({ content: "⚙️ Processing and compressing image..." });

      if (isGif) {
        await new Promise((resolve, reject) => {
          exec(
            `"${FFMPEG_PATH}" -i "${inputPath}" -vf "scale=${MAX_DIM}:${MAX_DIM}:force_original_aspect_ratio=decrease" -loop 0 -an -vsync 0 "${outputPath}"`,
            (err) => (err ? reject(err) : resolve())
          );
        });
      } else {
        await compressToLimit(buffer, outputPath);
      }

      const stats = fs.statSync(outputPath);
      if (stats.size > MAX_SIZE)
        return progressMsg.edit({
          content: "❌ Couldn’t compress file under Discord’s 512KB limit!",
        });

      await progressMsg.edit({ content: "🚀 Uploading sticker..." });

      // ✅ Upload to target server
      const sticker = await guild.stickers.create({
        file: outputPath,
        name: stickerName,
        tags: "custom, sticker, fun",
      });

      await progressMsg.edit({
        content: `✅ **Sticker added successfully!**\n📍 Name: **${sticker.name}**\n🏠 Uploaded to: **${guild.name}**\n🔗 ${sticker.url}`,
      });

      fs.unlinkSync(inputPath);
      fs.unlinkSync(outputPath);
    } catch (err) {
      console.error("Sticker creation error:", err);
      progressMsg.edit({ content: `❌ Error: ${err.message}` }).catch(() => {});
    }
  },
};
