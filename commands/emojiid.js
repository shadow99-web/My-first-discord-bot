const {
  SlashCommandBuilder,
  EmbedBuilder,
  parseEmoji,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("emojiid")
    .setDescription("Fetch emoji information using emoji or name")
    .addStringOption(opt =>
      opt
        .setName("emoji")
        .setDescription("Enter an emoji (😎 or <:custom:12345>)")
        .setRequired(true)
    ),

  name: "emojiid",
  aliases: ["emoteid", "getemoji"],

  async execute(context) {
    const { isPrefix, message, interaction, args } = context;
    const guild = message?.guild || interaction?.guild;

    // Unified input extraction
    const input = isPrefix
      ? args[0]
      : interaction.options.getString("emoji");

    const errorReply = async (text) => {
      if (isPrefix) {
        await message.reply({ content: text }).catch(() => {});
      } else {
        await interaction.reply({ content: text, flags: 64 }).catch(() => {});
      }
    };

    if (!input) return errorReply("❌ Please provide an emoji or emoji name.");

    // Try to find or parse emoji
    let emojiData = null;
    let parsed = parseEmoji(input);

    // 1️⃣ Guild emoji by name (:name: or just name)
    if (
      guild &&
      ((input.startsWith(":") && input.endsWith(":")) ||
        (!parsed.id && input.length <= 32))
    ) {
      const normalized = input.replace(/:/g, "");
      const found = guild.emojis.cache.find(
        e => e.name.toLowerCase() === normalized.toLowerCase()
      );

      if (found) {
        emojiData = {
          id: found.id,
          name: found.name,
          animated: found.animated,
        };
        parsed = { id: found.id, name: found.name, animated: found.animated };
      }
    }

    // 2️⃣ Custom emoji (<:name:id> or <a:name:id>)
    if (!emojiData && parsed?.id) {
      emojiData = {
        id: parsed.id,
        name: parsed.name,
        animated: parsed.animated ?? false,
      };
    }

    // 3️⃣ Unicode emoji
    if (!emojiData && input && !parsed?.id) {
      return errorReply("❌ That’s a standard Unicode emoji — it doesn’t have an ID.");
    }

    // ❌ Not found
    if (!emojiData) {
      return errorReply(
        "❌ Could not find that emoji. Make sure it’s a valid custom emoji name, emoji object, or from this server."
      );
    }

    // ✅ Construct Embed
    const emojiURL = `https://cdn.discordapp.com/emojis/${emojiData.id}.${emojiData.animated ? "gif" : "png"}?v=1`;
    const emojiFormat = `<${emojiData.animated ? "a" : ""}:${emojiData.name}:${emojiData.id}>`;

    const embed = new EmbedBuilder()
      .setTitle("🔍 Emoji Information")
      .setColor("Random")
      .setThumbnail(emojiURL)
      .addFields(
        { name: "Name", value: emojiData.name, inline: true },
        { name: "ID", value: `\`${emojiData.id}\``, inline: true },
        { name: "Animated", value: emojiData.animated ? "Yes" : "No", inline: true },
        { name: "Preview", value: emojiFormat, inline: true },
        { name: "Copyable Format", value: `\`${emojiFormat}\``, inline: false },
        { name: "Image URL", value: `[View Emoji](${emojiURL})`, inline: false }
      )
      .setFooter({ text: "Fetched via hybrid emojiid command" })
      .setTimestamp();

    if (isPrefix) {
      return message.reply({ embeds: [embed] }).catch(() => {});
    } else {
      return interaction.reply({ embeds: [embed] }).catch(() => {});
    }
  },
};
