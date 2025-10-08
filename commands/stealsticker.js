const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionsBitField,
} = require("discord.js");
const fs = require("fs");
const path = require("path");
const https = require("https");
const sharp = require("sharp"); // ✅ Image format + compression

module.exports = {
  name: "stealsticker",
  description: "Steal a sticker and upload it to your server (or another via server ID)",
  data: new SlashCommandBuilder()
  .setName("stealsticker")
  .setDescription("Steal a sticker and upload it")
  .addStringOption(option =>
    option.setName("name")
      .setDescription("Name for the new sticker")
      .setRequired(true)
  )
  .addStringOption(option =>
    option.setName("sticker_url")
      .setDescription("Sticker URL or send sticker with command")
      .setRequired(false)
  )
  .addStringOption(option =>
    option.setName("server_id")
      .setDescription("Optional: Upload to another server (you must have permissions there)")
      .setRequired(false)
  ),

  async execute(ctx) {
    const isSlash = !!ctx.isChatInputCommand;
    const user = isSlash ? ctx.user : ctx.author;
    const guild = isSlash ? ctx.guild : ctx.guild;
    const client = ctx.client;

    const stickerUrl = isSlash
      ? ctx.options.getString("sticker_url")
      : ctx.attachments.first()?.url;
    const name = isSlash
      ? ctx.options.getString("name")
      : ctx.content.split(" ").slice(1).join("_");
    const targetGuildId = isSlash
      ? ctx.options.getString("server_id")
      : ctx.content.split(" ")[2];

    // ✅ Determine target guild
    let targetGuild = guild;
    if (targetGuildId) {
      targetGuild = client.guilds.cache.get(targetGuildId);
      if (!targetGuild) {
        return ctx.reply({
          content: `❌ Invalid Server ID or I'm not in that server.`,
          ephemeral: true,
        });
      }
    }

    if (
      !targetGuild.members.me.permissions.has(
        PermissionsBitField.Flags.ManageEmojisAndStickers
      )
    ) {
      return ctx.reply({
        content: `❌ I don't have "Manage Emojis and Stickers" in **${targetGuild.name}**.`,
        ephemeral: true,
      });
    }

    let url;
    if (stickerUrl) url = stickerUrl;
    else if (ctx.message?.stickers?.first())
      url = ctx.message.stickers.first().url;
    else
      return ctx.reply({
        content: "❌ Please provide a sticker URL or send a sticker.",
        ephemeral: true,
      });

    try {
      const tempPath = path.join("/tmp", `sticker_${Date.now()}.png`);
      await downloadAndConvert(url, tempPath);

      const stats = fs.statSync(tempPath);
      if (stats.size > 512 * 1024) await compressImage(tempPath);

      const sticker = await targetGuild.stickers.create({
        file: tempPath,
        name,
        description: `Uploaded by ${user.username}`,
        tags: "fun",
      });

      fs.unlink(tempPath, () => {});

      const embed = new EmbedBuilder()
        .setTitle("🎟️ Sticker Added Successfully!")
        .setDescription(
          `Sticker **${sticker.name}** added to **${targetGuild.name}** ✅`
        )
        .setThumbnail(sticker.url)
        .setColor("Green");

      await ctx.reply({ embeds: [embed] });
    } catch (err) {
      console.error("❌ Sticker upload failed:", err);
      await ctx.reply({
        content:
          "❌ Upload failed! The file may be invalid, too large (>512 KB), or I lack permissions.",
        ephemeral: true,
      });
    }
  },
};

// --- Helper: Download & convert sticker to PNG ---
async function downloadAndConvert(url, outputPath) {
  return new Promise((resolve, reject) => {
    const tempRaw = path.join("/tmp", `raw_${Date.now()}.webp`);
    const file = fs.createWriteStream(tempRaw);
    https
      .get(url, (res) => {
        res.pipe(file);
        file.on("finish", async () => {
          file.close();
          try {
            await sharp(tempRaw)
              .png()
              .resize(512, 512, { fit: "inside" })
              .toFile(outputPath);
            fs.unlink(tempRaw, () => {});
            resolve();
          } catch (e) {
            fs.unlink(tempRaw, () => {});
            reject(e);
          }
        });
      })
      .on("error", (err) => {
        fs.unlink(tempRaw, () => {});
        reject(err);
      });
  });
}

// --- Helper: Compress large images ---
async function compressImage(filePath) {
  const buffer = await sharp(filePath)
    .png({ quality: 80, compressionLevel: 9 })
    .resize(512, 512, { fit: "inside" })
    .toBuffer();
  fs.writeFileSync(filePath, buffer);
}
