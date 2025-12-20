
// commands/steal.js
const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
} = require("discord.js");
const axios = require("axios");

/* ---------------------------------- */
/* Utils                               */
/* ---------------------------------- */

// ✅ Safe emoji/sticker name
function cleanName(input) {
  if (!input) return "emote_item";
  return String(input)
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 32) || "emote_item";
}

// ✅ Unified reply helper
async function safeRespond({ interaction, message, safeReply }, payload) {
  try {
    if (interaction && !interaction.isFake) {
      return interaction.replied || interaction.deferred
        ? interaction.followUp(payload)
        : interaction.reply(payload);
    }
    if (message) return message.reply(payload);
  } catch (err) {
    console.error("❌ safeRespond error:", err);
  }
}

// ✅ Download image → buffer
async function fetchBuffer(url) {
  const res = await axios.get(url, { responseType: "arraybuffer", timeout: 15000 });
  return Buffer.from(res.data);
}

/* ---------------------------------- */
/* Command                             */
/* ---------------------------------- */

module.exports = {
  data: new SlashCommandBuilder()
    .setName("steal")
    .setDescription("Steal an emoji or sticker by replying to a message")
    .addStringOption(o =>
      o.setName("server_id").setDescription("Target server ID (optional)")
    ),

  name: "steal",
  aliases: ["stealemote", "stealemoji", "stealsticker"],

  /**
   * context = { interaction, message, client, args, safeReply }
   */
  async execute(context) {
    const { interaction, message, client, args, safeReply } = context;

    // ✅ IMPORTANT FIX
    const isSlash = interaction && !interaction.isFake;
    const actor = isSlash ? interaction.user : message.author;

    const serverId = isSlash
      ? interaction.options.getString("server_id")
      : args?.[0];

    const targetGuild =
      serverId
        ? client.guilds.cache.get(serverId)
        : isSlash
        ? interaction.guild
        : message.guild;

    /* ---------------------------------- */
    /* Permission checks                  */
    /* ---------------------------------- */

    if (!targetGuild) {
      return safeRespond({ interaction, message, safeReply }, {
        content: "❌ I can't find that server.",
        ephemeral: true,
      });
    }

    if (
      !targetGuild.members.me.permissions.has(
        PermissionFlagsBits.ManageEmojisAndStickers
      )
    ) {
      return safeRespond({ interaction, message, safeReply }, {
        content: "❌ I need **Manage Emojis & Stickers** permission.",
        ephemeral: true,
      });
    }

    /* ---------------------------------- */
    /* 🔥 FETCH REPLIED MESSAGE (FIXED)   */
    /* ---------------------------------- */

    let repliedMsg = null;

    try {
      // Slash context menu
      if (isSlash && interaction.targetId) {
        repliedMsg = await interaction.channel.messages.fetch(interaction.targetId);
      }
      // Prefix / no-prefix / mobile reply
      else if (message?.reference?.messageId) {
        repliedMsg = await message.fetchReference();
      }
    } catch (err) {
      console.error("❌ Fetch replied message failed:", err);
    }

    if (!repliedMsg) {
      return safeRespond({ interaction, message, safeReply }, {
        content: "❌ Reply to a message or use **Message Context Menu → Apps → Steal**.",
        ephemeral: true,
      });
    }

    /* ---------------------------------- */
    /* 🔍 Detect Emoji / Sticker / Image  */
    /* ---------------------------------- */

    let assetUrl = null;
    let rawName = null;
    let detectedType = null;

    // 1️⃣ Custom emoji in text (desktop)
    const emojiRegex = /<(a)?:([a-zA-Z0-9_]+):(\d+)>/;
    const match = emojiRegex.exec(repliedMsg.content || "");

    if (match) {
      const animated = !!match[1];
      rawName = match[2];
      assetUrl = `https://cdn.discordapp.com/emojis/${match[3]}.${animated ? "gif" : "png"}`;
      detectedType = "emoji";
    }

    // 2️⃣ Mobile emoji (embed image)
    if (
      !assetUrl &&
      repliedMsg.embeds?.[0]?.image?.url?.includes("/emojis/")
    ) {
      const url = repliedMsg.embeds[0].image.url;
      const id = url.match(/emojis\/(\d+)/)?.[1];
      if (id) {
        assetUrl = `https://cdn.discordapp.com/emojis/${id}.${url.endsWith(".gif") ? "gif" : "png"}`;
        rawName = "stolen_emoji";
        detectedType = "emoji";
      }
    }

    // 3️⃣ Sticker
    if (!assetUrl && repliedMsg.stickers?.size) {
      const sticker = repliedMsg.stickers.first();
      assetUrl = sticker.url;
      rawName = sticker.name;
      detectedType = "sticker";
    }

    // 4️⃣ Image attachment
    if (!assetUrl && repliedMsg.attachments?.size) {
      const att = repliedMsg.attachments.first();
      if (att.contentType?.startsWith("image")) {
        assetUrl = att.url;
        rawName = att.name?.split(".")[0];
        detectedType = "attachment";
      }
    }

    if (!assetUrl) {
      return safeRespond({ interaction, message, safeReply }, {
        content: "❌ No emoji, sticker, or image found.",
        ephemeral: true,
      });
    }

    /* ---------------------------------- */
    /* Preview                            */
    /* ---------------------------------- */

    const clean = cleanName(rawName);

    const embed = new EmbedBuilder()
      .setTitle("🪄 Steal Preview")
      .setDescription(`Type: **${detectedType.toUpperCase()}**\nName: \`${clean}\``)
      .setImage(assetUrl)
      .setFooter({ text: `Requested by ${actor.tag}` });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("steal_emoji")
        .setLabel("Add as Emoji")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("steal_sticker")
        .setLabel("Add as Sticker")
        .setStyle(ButtonStyle.Secondary)
    );

    const sent = isSlash
      ? await interaction.reply({ embeds: [embed], components: [row], fetchReply: true })
      : await message.reply({ embeds: [embed], components: [row] });

    /* ---------------------------------- */
    /* Button collector                   */
    /* ---------------------------------- */

    const collector = sent.createMessageComponentCollector({ time: 30000 });

    collector.on("collect", async btn => {
      if (btn.user.id !== actor.id) {
        return btn.reply({ content: "❌ Only command user can click.", ephemeral: true });
      }

      await btn.deferUpdate();
      const buffer = await fetchBuffer(assetUrl);

      try {
        if (btn.customId === "steal_emoji") {
          if (buffer.length > 256 * 1024) {
            return btn.editReply({ content: "⚠️ Emoji too large.", components: [] });
          }
          const e = await targetGuild.emojis.create({ attachment: buffer, name: clean });
          return btn.editReply({ content: `✅ Emoji added: ${e}`, components: [] });
        }

        if (btn.customId === "steal_sticker") {
          await targetGuild.stickers.create({
            file: buffer,
            name: clean.slice(0, 30),
            tags: "stolen",
          });
          return btn.editReply({ content: "✅ Sticker added.", components: [] });
        }
      } catch (err) {
        console.error(err);
        return btn.editReply({ content: "❌ Failed to add.", components: [] });
      }
    });
  },
};
