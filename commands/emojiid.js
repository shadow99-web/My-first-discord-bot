const { 
  SlashCommandBuilder, 
  EmbedBuilder, 
  parseEmoji 
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("emojiid")
    .setDescription("Fetch emoji information using emoji or name")
    .addStringOption(opt =>
      opt.setName("emoji")
        .setDescription("Enter an emoji (😎 or <:custom:12345>)")
        .setRequired(true)
    ),

  name: "emojiid",
  aliases: ["emoteid", "getemoji"],

  async execute(context) {
    const { isPrefix, message, interaction, args } = context;

    // Unified input extraction
    const input = isPrefix 
      ? args[0] 
      : interaction.options.getString("emoji");
    
    if (!input) {
      const replyText = "❌ Please provide an emoji or emoji name.";
      return isPrefix 
        ? message.reply(replyText) 
        : interaction.reply({ content: replyText, ephemeral: true });
    }

    // Try parsing with Discord.js built-in function
    const parsed = parseEmoji(input);

    let emojiData = null;

    // ✅ Case 1: Parsed valid custom emoji like <:name:id>
    if (parsed?.id) {
      emojiData = {
        id: parsed.id,
        name: parsed.name,
        animated: parsed.animated ?? false
      };
    }

    // ✅ Case 2: User gave a :name: input, so try finding by name
    else if (input.startsWith(":") && input.endsWith(":")) {
      const name = input.replace(/:/g, "");
      const found = message?.guild?.emojis?.cache.find(e => e.name.toLowerCase() === name.toLowerCase());

      if (found) {
        emojiData = {
          id: found.id,
          name: found.name,
          animated: found.animated
        };
      }
    }

    // ✅ Case 3: Regular unicode emoji (😎)
    else if (!parsed?.id) {
      const replyText = "❌ This appears to be a standard Unicode emoji — it doesn’t have an ID.";
      return isPrefix 
        ? message.reply(replyText) 
        : interaction.reply({ content: replyText, ephemeral: true });
    }

    // 🧩 Invalid or unknown
    if (!emojiData) {
      const replyText = "❌ Could not find that emoji. Make sure it’s a valid server or Discord emoji.";
      return isPrefix 
        ? message.reply(replyText) 
        : interaction.reply({ content: replyText, ephemeral: true });
    }

    // ✅ Construct embed with all details
    const emojiURL = `https://cdn.discordapp.com/emojis/${emojiData.id}.${emojiData.animated ? "gif" : "png"}?v=1`;
    const emojiFormat = `<${emojiData.animated ? "a" : ""}:${emojiData.name}:${emojiData.id}>`;

    const embed = new EmbedBuilder()
      .setTitle("🔍 Emoji Information")
      .setColor("Random")
      .setThumbnail(emojiURL)
      .addFields(
        { name: "Name", value: emojiData.name, inline: true },
        { name: "ID", value: ``${emojiData.id}``, inline: true },
        { name: "Animated", value: emojiData.animated ? "Yes" : "No", inline: true },
        { name: "Preview", value: emojiFormat, inline: true },
        { name: "Copyable Format", value: ``${emojiFormat}``, inline: false },
        { name: "Image URL", value: `[View Emoji](${emojiURL})`, inline: false }
      )
      .setFooter({ text: "Fetched via hybrid emojiid command" })
      .setTimestamp();

    return isPrefix
      ? message.reply({ embeds: [embed] })
      : interaction.reply({ embeds: [embed] });
  }
};
