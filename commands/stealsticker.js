// stealsticker.js
const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require("discord.js");
const sharp = require("sharp");
const gifFrames = require("gif-frames");
const fs = require("fs");
const path = require("path");

const TMP_DIR = "/tmp"; // change if your host needs different tmp path
const MAX_DIM = 320;
const MAX_SIZE = 512 * 1024; // 512 KB

module.exports = {
  data: new SlashCommandBuilder()
    .setName("stealsticker")
    .setDescription("Steal an image/sticker/GIF (supports other-server stickers via ID/URL) and add it as a server sticker")
    .addStringOption(opt => opt.setName("serverid").setDescription("Server ID where sticker will be added").setRequired(false))
    .addStringOption(opt => opt.setName("source").setDescription("Reply, or provide a sticker ID or direct URL to fetch").setRequired(false)),

  // For prefix support your context needs: .isPrefix, .message, .interaction, .client
  async execute(context) {
    const { interaction, message, isPrefix, client } = context;
    const user = isPrefix ? message.author : interaction.user;

    // universal reply wrapper
    const reply = async (payload) => {
      if (isPrefix) return await message.reply(payload);
      else return await interaction.reply({ ...payload, ephemeral: true }).catch(() => {});
    };

    // get target guild (where sticker will be added)
    const serverId = isPrefix
      ? (message.content.split(" ")[1] || null) // optional first arg for prefix (serverId)
      : interaction.options.getString("serverid");
    const guild = serverId ? client.guilds.cache.get(serverId) : (isPrefix ? message.guild : interaction.guild);
    if (!guild) return reply({ content: "⚠️ Couldn’t find that server. Make sure the bot is in it." });

    if (!guild.members.me.permissions.has(PermissionsBitField.Flags.ManageEmojisAndStickers)) {
      return reply({ content: "❌ I need Manage Emojis & Stickers permission in the target server." });
    }

    // Determine source: priority order
    // 1) Provided 'source' option/arg (sticker ID or URL)
    // 2) If prefix: maybe message was a reply, fetch referenced message
    // 3) If slash and no source: ask user via modal (not included here) or fail
    let sourceInput = isPrefix ? (message.content.split(" ").slice(2).join(" ") || null) : interaction.options.getString("source");
    sourceInput = sourceInput ? sourceInput.trim() : null;

    // function to fetch buffer from a URL
    const fetchBufferFromUrl = async (url) => {
      const res = await fetch(url, { timeout: 15000 });
      if (!res.ok) throw new Error(`Failed to fetch ${url} (${res.status})`);
      const arr = await res.arrayBuffer();
      return Buffer.from(arr);
    };

    // try build possible CDN URLs from a sticker ID
    const tryStickerIdUrls = async (id) => {
      // Discord CDN common patterns
      const tries = [
        `https://cdn.discordapp.com/stickers/${id}.png`,
        `https://cdn.discordapp.com/stickers/${id}.webp`,
        `https://cdn.discordapp.com/stickers/${id}` // sometimes works and returns right content-type
      ];

      for (const u of tries) {
        try {
          const b = await fetchBufferFromUrl(u);
          return b;
        } catch (e) {
          // continue trying
        }
      }
      throw new Error("No CDN result for sticker ID");
    };

    // if sourceInput is null, try to use replied message (prefix) or fail for slash
    let initialBuffer = null;
    try {
      if (sourceInput) {
        // If it's a URL -> fetch directly
        if (/^https?:\/\//i.test(sourceInput)) {
          initialBuffer = await fetchBufferFromUrl(sourceInput);
        } else if (/^\d{16,}$/g.test(sourceInput)) {
          // looks like an ID (Discord IDs are 17-19 digits commonly)
          initialBuffer = await tryStickerIdUrls(sourceInput);
        } else {
          // not URL or ID — maybe user passed a message URL like https://discord.com/channels/guildId/channelId/messageId
          const discordMsgUrlMatch = sourceInput.match(/discord(?:app)?\.com\/channels\/(\d+)\/(\d+)\/(\d+)/i);
          if (discordMsgUrlMatch) {
            const [, gId, cId, mId] = discordMsgUrlMatch;
            try {
              const ch = await client.channels.fetch(cId).catch(() => null);
              if (ch && ch.isText()) {
                const msg = await ch.messages.fetch(mId).catch(() => null);
                if (msg) {
                  if (msg.stickers?.size) initialBuffer = await fetchBufferFromUrl(msg.stickers.first().url);
                  else if (msg.attachments?.size) initialBuffer = await fetchBufferFromUrl(msg.attachments.first().url);
                }
              }
            } catch (e) { /* ignore */ }
          }
          // if still null, attempt to treat input as sticker ID fallback
          if (!initialBuffer && /^\d{16,}$/.test(sourceInput)) {
            initialBuffer = await tryStickerIdUrls(sourceInput);
          }
        }
      }

      // If no sourceInput or fetch failed, try to use replied message (prefix)
      if (!initialBuffer) {
        if (isPrefix && message.reference) {
          const ref = await message.fetchReference().catch(() => null);
          if (ref) {
            if (ref.stickers?.size) initialBuffer = await fetchBufferFromUrl(ref.stickers.first().url);
            else if (ref.attachments?.size) initialBuffer = await fetchBufferFromUrl(ref.attachments.first().url);
          }
        } else if (!isPrefix) {
          // For slash, if no source provided we can fail politely
          return reply({ content: "❌ Provide a `source` (sticker ID, message URL, or direct image URL) or use the prefix reply method." });
        }
      }

      if (!initialBuffer) return reply({ content: "⚠️ Couldn't find or fetch any image/sticker from the provided source." });
    } catch (err) {
      console.error("Source fetch error:", err);
      return reply({ content: `❌ Failed to fetch source: ${err.message}` });
    }

    // At this point initialBuffer is a Buffer of some image (png/webp/gif/..)
    // Convert pipeline: GIF -> first frame, WebP -> PNG, resize, compress to <512KB
    let workingBuffer = initialBuffer;

    // Detect GIF by magic bytes
    const isGif = workingBuffer && workingBuffer.slice(0, 3).toString("ascii") === "GIF";
    if (isGif) {
      try {
        // write temp gif -> extract 1st frame
        const gifTmp = path.join(TMP_DIR, `tmp_${Date.now()}.gif`);
        fs.writeFileSync(gifTmp, workingBuffer);
        const frames = await gifFrames({ url: gifTmp, frames: 0, outputType: "png", cumulative: false });
        const framePath = path.join(TMP_DIR, `frame_${Date.now()}.png`);
        await new Promise((resolve, reject) => {
          const s = frames[0].getImage().pipe(fs.createWriteStream(framePath));
          s.on("finish", resolve);
          s.on("error", reject);
        });
        workingBuffer = fs.readFileSync(framePath);
        // cleanup
        try { fs.unlinkSync(gifTmp); } catch {}
        try { fs.unlinkSync(framePath); } catch {}
      } catch (e) {
        console.warn("GIF->frame extraction failed, will attempt to use original buffer", e.message);
      }
    }

    // use sharp to convert to PNG and resize
    try {
      let resized = await sharp(workingBuffer)
        .resize({ width: MAX_DIM, height: MAX_DIM, fit: "inside" })
        .png({ quality: 90, compressionLevel: 9 })
        .toBuffer();

      // if still too big, try downscale to 256 then 128
      if (resized.length > MAX_SIZE) {
        resized = await sharp(resized).resize({ width: 256, height: 256, fit: "inside" }).png({ quality: 85 }).toBuffer();
      }
      if (resized.length > MAX_SIZE) {
        resized = await sharp(resized).resize({ width: 128, height: 128, fit: "inside" }).png({ quality: 80 }).toBuffer();
      }

      if (resized.length > MAX_SIZE) {
        return reply({ content: "❌ Couldn't compress image below Discord's 512KB limit. Try a smaller image or different source." });
      }

      // final upload as sticker
      const sticker = await guild.stickers.create({
        file: resized,
        name: `sticker_${Date.now()}`,
        tags: "stolen,custom"
      });

      const embed = new EmbedBuilder()
        .setTitle("✅ Sticker Added Successfully")
        .setDescription(`Added to **${guild.name}** by ${user.tag}`)
        .setImage(sticker.url)
        .setColor("Green");

      return reply({ embeds: [embed] });
    } catch (err) {
      console.error("Sticker creation pipeline error:", err);
      return reply({ content: "❌ Failed to convert/upload the sticker. See console for details." });
    }
  }
};
