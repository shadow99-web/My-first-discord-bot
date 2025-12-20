// commands/steal.js
const { 
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits
} = require("discord.js");
const axios = require("axios");

// Safe name cleaner for Discord emoji/sticker rules
function cleanName(input) {
  if (!input) return "emote_item";
  return String(input)
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_") // invalid -> underscore
    .replace(/_+/g, "_") // collapse multiple underscores
    .replace(/^_+|_+$/g, "") // trim underscores
    .slice(0, 32) || "emote_item";
}

// Small helper to send reply using user's handler
async function safeRespond({ interaction, message, safeReply }, payload) {
  try {
    if (interaction) {
      // prefer safeReply if provided by your interaction handler
      if (safeReply) return safeReply(payload);
      if (payload.fetchReply) {
        // keep as is (rare)
        return interaction.reply(payload);
      }
      return interaction.reply(payload).catch(() => {});
    } else if (message) {
      if (typeof payload === "string") return message.reply(payload).catch(() => {});
      return message.reply(payload).catch(() => {});
    }
  } catch (e) {
    try { if (interaction && interaction.followUp) return interaction.followUp(payload).catch(()=>{}); }
    catch {}
  }
}

// download URL -> Buffer (throws on fail)
async function fetchBuffer(url, timeout = 15000) {
  const res = await axios.get(url, { responseType: "arraybuffer", timeout });
  return Buffer.from(res.data);
}

module.exports = {
  // slash metadata (for deploy script)
  data: new SlashCommandBuilder()
    .setName("steal")
    .setDescription("Steal an emoji or sticker by replying to a message")
    .addStringOption(opt => opt.setName("server_id").setDescription("Target server ID (optional)")),

  name: "steal",
  aliases: ["stealemote", "stealemoji", "stealsticker"],

  /**
   * context: { interaction, message, client, args, safeReply }
   */
  async execute(context) {
    const { interaction, message, client, args, safeReply } = context;
    const isSlash = !!interaction;
    const actor = isSlash ? interaction.user : message.author;
    const serverId = isSlash ? interaction.options.getString("server_id") : args?.[0];
    const targetGuild = serverId ? client.guilds.cache.get(serverId) : (isSlash ? interaction.guild : message.guild);

    // Basic validations
    if (!targetGuild) {
      return safeRespond({ interaction, message, safeReply }, { content: "❌ I can't find that server or I'm not in it.", ephemeral: true });
    }
    if (!targetGuild.members.me.permissions.has(PermissionFlagsBits.ManageEmojisAndStickers)) {
      return safeRespond({ interaction, message, safeReply }, { content: "❌ I need `Manage Emojis and Stickers` permission in the target server.", ephemeral: true });
    }

    // locate replied message (supports context menu / reply / message.reference)
    let repliedMsg = null;
    try {
      if (isSlash) {
        // If using message context targetId (interaction.targetId), try to fetch it
        const targetId = interaction.targetId;
        if (targetId) repliedMsg = await interaction.channel.messages.fetch(targetId).catch(() => null);
      } else {
        if (message.reference) {
          repliedMsg = await message.channel.messages.fetch(message.reference.messageId).catch(() => null);
        }
      }
    } catch (e) {
      // ignore
    }

    if (!repliedMsg) {
      return safeRespond({ interaction, message, safeReply }, { content: "❌ Please reply to a message that contains a custom emoji, sticker, or an image attachment.", ephemeral: true });
    }

    // Attempt to detect an asset (priority: custom emoji in text -> sticker -> attachment)
    let assetUrl = null;
    let rawName = null;
    let detectedType = null; // "emoji" or "sticker" or "attachment"
    // 1️⃣ DESKTOP: <:name:id> or <a:name:id>
const emojiRegex = /<(a)?:([a-zA-Z0-9_]+):(\d+)>/;
let emMatch = emojiRegex.exec(repliedMsg.content || "");

if (emMatch) {
  const animated = !!emMatch[1];
  rawName = emMatch[2];
  const id = emMatch[3];
  const ext = animated ? "gif" : "png";
  assetUrl = `https://cdn.discordapp.com/emojis/${id}.${ext}`;
  detectedType = "emoji";
}

// 2️⃣ MOBILE: emoji comes as EMBED IMAGE (NO TEXT)
if (
  !assetUrl &&
  repliedMsg.embeds?.length &&
  repliedMsg.embeds[0].image?.url &&
  repliedMsg.embeds[0].image.url.includes("/emojis/")
) {
  const url = repliedMsg.embeds[0].image.url;

  // extract emoji ID
  const idMatch = url.match(/emojis\/(\d+)\./);
  if (idMatch) {
    const id = idMatch[1];
    const animated = url.endsWith(".gif");

    rawName = "stolen_emoji";
    assetUrl = `https://cdn.discordapp.com/emojis/${id}.${animated ? "gif" : "png"}`;
    detectedType = "emoji";
  }
                                                          }

    // 2) sticker
    if (!assetUrl && repliedMsg.stickers && repliedMsg.stickers.size > 0) {
      const sticker = repliedMsg.stickers.first();
      rawName = sticker.name || "stolen_sticker";
      // sticker.url typically returns an image (webp) or an animated resource
      assetUrl = sticker.url;
      detectedType = "sticker";
    }

    // 3) attachments (image attachments)
    if (!assetUrl && repliedMsg.attachments && repliedMsg.attachments.size > 0) {
      const att = repliedMsg.attachments.first();
      // verify it's an image file
      if (att.contentType && att.contentType.startsWith("image")) {
        assetUrl = att.url;
        rawName = att.name?.split(".")[0] || "stolen_image";
        detectedType = "attachment";
      } else {
        // still attempt if extension looks image-like
        if (/\.(png|jpe?g|gif|webp|apng)$/i.test(att.url)) {
          assetUrl = att.url;
          rawName = att.name?.split(".")[0] || "stolen_image";
          detectedType = "attachment";
        }
      }
    }

    if (!assetUrl) {
      return safeRespond({ interaction, message, safeReply }, { content: "❌ Could not find a custom emoji, sticker, or image attachment in that message.", ephemeral: true });
    }

    const clean = cleanName(rawName);
    const previewEmbed = new EmbedBuilder()
      .setTitle(`<a:a_online:1440333669863522485> Steal Preview`)
      .setDescription(`Detected as: **${detectedType.toUpperCase()}**\nName (cleaned): \`${clean}\``)
      .setImage(assetUrl)
      .setFooter({ text: `Requested by ${actor.tag}` })
      .setTimestamp();

    // buttons: add as emoji or as sticker
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("steal_as_emoji").setLabel("🪄 Add as Emoji").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("steal_as_sticker").setLabel("🎟️ Add as Sticker").setStyle(ButtonStyle.Secondary)
    );

    // send preview
    let sent;
    if (isSlash) {
      sent = await interaction.reply({ embeds: [previewEmbed], components: [row], fetchReply: true }).catch(() => null);
    } else {
      sent = await message.reply({ embeds: [previewEmbed], components: [row] }).catch(() => null);
    }
    if (!sent) return; // if reply failed, stop

    // collector (only allow the command user)
    const collector = sent.createMessageComponentCollector({ time: 30_000 });

    collector.on("collect", async (btn) => {
      if (btn.user.id !== actor.id) {
        return btn.reply({ content: "❌ Only the command user can use these buttons.", ephemeral: true });
      }
      await btn.deferUpdate().catch(()=>{});

      try {
        // download buffer
        const buffer = await fetchBuffer(assetUrl);

        // Decide action
        if (btn.customId === "steal_as_emoji") {
          // discord emoji file size limit ~256 KB — check
          if (buffer.length > 256 * 1024) {
            return btn.editReply({
              content: "⚠️ The file is too large for an emoji (>256 KB). Try adding as a sticker instead.",
              embeds: [],
              components: []
            });
          }

          // Try create emoji
          const created = await targetGuild.emojis.create({ attachment: buffer, name: clean }).catch(err => { throw err; });

          const success = new EmbedBuilder()
            .setColor("Green")
            .setTitle("<a:purple_verified:1439271259190988954> Emoji Added!")
            .setDescription(`Added to **${targetGuild.name}** as \`:${created.name}:\``)
            .setThumbnail(created.imageURL())
            .setTimestamp();

          return btn.editReply({ embeds: [success], components: [] });
        } else if (btn.customId === "steal_as_sticker") {
          // Stickers: file should be webp or PNG. Use buffer and name/tags.
          // Discord requires sticker packs for some types; for guild stickers we can create webp/png.
          // Ensure size limit: 500 KB for server stickers (legacy), but recent limits vary — attempt and catch.
          const sticker = await targetGuild.stickers.create({
            file: buffer,
            name: clean.slice(0, 30),
            tags: "stolen"
          }).catch(err => { throw err; });

          const success = new EmbedBuilder()
            .setColor("Green")
            .setTitle("<a:purple_verified:1439271259190988954> Sticker Added!")
            .setDescription(`Added sticker **${sticker.name}** to **${targetGuild.name}**`)
            .setThumbnail(assetUrl)
            .setTimestamp();

          return btn.editReply({ embeds: [success], components: [] });
        } else {
          return btn.editReply({ content: "❌ Unknown action.", components: [] });
        }
      } catch (err) {
        console.error("❌ steal command error:", err);
        // Provide helpful fallback messages
        let friendly = "⚠️ Failed to add emoji/sticker. This can be due to:\n• Unsupported file type\n• File too large for emojis/stickers\n• Missing permissions (Manage Emojis & Stickers)\n• Discord API restrictions";
        if (err?.code === 50046) friendly = "⚠️ Discord rejected the asset (Invalid Asset). Try a different source or smaller file.";
        if (err?.message?.includes("Invalid Form Body")) friendly = `⚠️ Discord rejected the request. (${err.message})`;

        try {
          return btn.editReply({ content: friendly, embeds: [], components: [] });
        } catch {
          try { if (isSlash) interaction.followUp({ content: friendly, ephemeral: true }); else message.reply(friendly); } catch {}
        }
      }
    });

    collector.on("end", async () => {
      try {
        if (sent.editable) await sent.edit({ components: [] }).catch(() => {});
      } catch {}
    });
  }
};
