// commands/steal.js
const {
  ContextMenuCommandBuilder,
  ApplicationCommandType,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits
} = require("discord.js");
const axios = require("axios");

function cleanName(input = "emote_item") {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 32) || "emote_item";
}

async function fetchBuffer(url) {
  const res = await axios.get(url, { responseType: "arraybuffer" });
  return Buffer.from(res.data);
}

module.exports = {
  // ✅ MESSAGE CONTEXT MENU (RIGHT CLICK → APPS → STEAL)
  data: new ContextMenuCommandBuilder()
    .setName("Steal")
    .setType(ApplicationCommandType.Message),

  name: "steal",
  aliases: ["stealemote"],

  async execute(context) {
    const { interaction, message, client } = context;

    const targetGuild = interaction?.guild || message.guild;
    const actor = interaction?.user || message.author;

    if (!targetGuild.members.me.permissions.has(PermissionFlagsBits.ManageEmojisAndStickers)) {
      return interaction.reply({ content: "❌ I need **Manage Emojis & Stickers**.", ephemeral: true });
    }

    // ✅ GET TARGET MESSAGE
    const repliedMsg = interaction
      ? interaction.targetMessage
      : message.reference
        ? await message.channel.messages.fetch(message.reference.messageId)
        : null;

    if (!repliedMsg) {
      return interaction.reply({ content: "❌ Reply to a message or use message context menu.", ephemeral: true });
    }

    let assetUrl, rawName, detectedType;

    // DESKTOP EMOJI
    const emojiMatch = repliedMsg.content?.match(/<(a)?:([^:]+):(\d+)>/);
    if (emojiMatch) {
      const [, animated, name, id] = emojiMatch;
      assetUrl = `https://cdn.discordapp.com/emojis/${id}.${animated ? "gif" : "png"}`;
      rawName = name;
      detectedType = "emoji";
    }

    // MOBILE EMOJI (EMBED)
    if (!assetUrl && repliedMsg.embeds?.[0]?.image?.url?.includes("/emojis/")) {
      const url = repliedMsg.embeds[0].image.url;
      const id = url.match(/emojis\/(\d+)\./)?.[1];
      if (id) {
        assetUrl = url;
        rawName = "stolen_emoji";
        detectedType = "emoji";
      }
    }

    // STICKER
    if (!assetUrl && repliedMsg.stickers?.size) {
      const sticker = repliedMsg.stickers.first();
      assetUrl = sticker.url;
      rawName = sticker.name;
      detectedType = "sticker";
    }

    // ATTACHMENT
    if (!assetUrl && repliedMsg.attachments?.size) {
      const att = repliedMsg.attachments.first();
      if (att.contentType?.startsWith("image")) {
        assetUrl = att.url;
        rawName = att.name.split(".")[0];
        detectedType = "attachment";
      }
    }

    if (!assetUrl) {
      return interaction.reply({ content: "❌ No emoji, sticker, or image found.", ephemeral: true });
    }

    const clean = cleanName(rawName);

    const embed = new EmbedBuilder()
      .setTitle("🪄 Steal Preview")
      .setDescription(`Detected: **${detectedType.toUpperCase()}**\nName: \`${clean}\``)
      .setImage(assetUrl)
      .setFooter({ text: `Requested by ${actor.tag}` });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("emoji").setLabel("Add Emoji").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("sticker").setLabel("Add Sticker").setStyle(ButtonStyle.Secondary)
    );

    await interaction.reply({ embeds: [embed], components: [row] });

    const msg = await interaction.fetchReply();
    const collector = msg.createMessageComponentCollector({ time: 30000 });

    collector.on("collect", async btn => {
      if (btn.user.id !== actor.id) return btn.reply({ content: "❌ Not for you.", ephemeral: true });

      await btn.deferUpdate();
      const buffer = await fetchBuffer(assetUrl);

      try {
        if (btn.customId === "emoji") {
          if (buffer.length > 256_000) {
            return btn.editReply({ content: "⚠️ Emoji too large.", components: [] });
          }
          const emoji = await targetGuild.emojis.create({ attachment: buffer, name: clean });
          return btn.editReply({ content: `✅ Added ${emoji}`, components: [] });
        }

        if (btn.customId === "sticker") {
          await targetGuild.stickers.create({ file: buffer, name: clean, tags: "stolen" });
          return btn.editReply({ content: "✅ Sticker added.", components: [] });
        }
      } catch (err) {
        console.error(err);
        return btn.editReply({ content: "❌ Failed to add.", components: [] });
      }
    });
  }
};
