// emojiadd.js
const {
  SlashCommandBuilder,
  PermissionFlagsBits,
} = require("discord.js");
const fetch = require("node-fetch");

// Prefix command export (if you are using your own handler)
module.exports = {
  name: "emojiadd",
  description: "Add an emoji to this server.",
  aliases: ["addemoji"],

  // ============================
  // PREFIX COMMAND HANDLER
  // ============================
  async run(message, args) {
    const emoji = args[0];
    const name = args[1] || "emoji";

    if (!emoji) return message.reply("❌ Provide an emoji to add.");

    const guild = message.guild;
    if (!guild) return;

    if (!guild.members.me.permissions.has(PermissionFlagsBits.ManageEmojisAndStickers))
      return message.reply("❌ I don’t have **Manage Emojis** permission.");

    const emojiUrl = await getEmojiURL(emoji);
    if (!emojiUrl) return message.reply("❌ Could not fetch emoji from API.");

    try {
      const added = await guild.emojis.create({
        attachment: emojiUrl,
        name: name,
      });
      return message.reply(`✅ Emoji added: ${added.toString()}`);
    } catch (err) {
      console.error(err);
      return message.reply("❌ Error adding emoji.");
    }
  },

  // ============================
  // SLASH COMMAND
  // ============================
  data: new SlashCommandBuilder()
    .setName("emojiadd")
    .setDescription("Add an emoji to this server.")
    .addStringOption(o =>
      o.setName("emoji")
        .setDescription("Emoji to add")
        .setRequired(true)
    )
    .addStringOption(o =>
      o.setName("name")
        .setDescription("Name of the emoji")
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageEmojisAndStickers),

  async execute(interaction) {
    const emoji = interaction.options.getString("emoji");
    const name = interaction.options.getString("name") || "emoji";

    const guild = interaction.guild;

    if (!guild.members.me.permissions.has(PermissionFlagsBits.ManageEmojisAndStickers))
      return interaction.reply({ content: "❌ I don’t have **Manage Emojis** permission.", ephemeral: true });

    await interaction.deferReply({ ephemeral: false });

    const emojiUrl = await getEmojiURL(emoji);
    if (!emojiUrl) return interaction.editReply("❌ Could not fetch emoji from API.");

    try {
      const added = await guild.emojis.create({
        attachment: emojiUrl,
        name: name,
      });
      return interaction.editReply(`✅ Emoji added: ${added.toString()}`);
    } catch (err) {
      console.error(err);
      return interaction.editReply("❌ Error adding emoji.");
    }
  }
};

// ============================
// EMOJI API FETCH FUNCTION
// ============================
async function getEmojiURL(inputEmoji) {
  try {
    const res = await fetch(
      `https://emoji-api.com/emojis?search=${encodeURIComponent(inputEmoji)}&access_key=${process.env.EMOJI_API_KEY}`
    );

    if (!res.ok) return null;

    const data = await res.json();
    if (!data.length) return null;

    // This API provides unicode emoji – we convert them to CDN
    const unicode = data[0].character;
    const codepoint = [...unicode]
      .map(u => u.codePointAt(0).toString(16))
      .join("-");

    // Discord supports PNG/WebP for unicode CDN
    return `https://cdn.jsdelivr.net/gh/twitter/twemoji/assets/72x72/${codepoint}.png`;
  } catch (e) {
    console.error("API error:", e);
    return null;
  }
}
