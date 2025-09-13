const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require("discord.js");

module.exports = {
  name: "stealemojis",
  description: "Steal multiple emojis from another server",
  data: new SlashCommandBuilder()
    .setName("stealemojis")
    .setDescription("Copy multiple emojis to this server")
    .addStringOption(option =>
      option.setName("emojis")
        .setDescription("List of emojis separated by space (like <:emoji:ID> or URL)")
        .setRequired(true)
    ),

  async execute({ interaction, message, args, client }) {
    const guild = interaction?.guild || message.guild;
    const user = interaction?.user || message.author;
    const blueHeart = "<a:blue_heart_1414309560231002194:1414309560231002194>";

    // Permissions check
    if (!guild.members.me.permissions.has(PermissionsBitField.Flags.ManageEmojisAndStickers)) {
      const reply = "❌ I need `Manage Emojis and Stickers` permission!";
      return interaction 
        ? interaction.reply({ content: reply, ephemeral: true })
        : message.reply(reply);
    }

    // Parse input
    const input = interaction 
      ? interaction.options.getString("emojis") 
      : args.join(" ");
    let emojiList = input.split(/ +/).filter(e => e);

    // 🔒 Limit safeguard
    const limit = 10;
    if (emojiList.length > limit) {
      emojiList = emojiList.slice(0, limit);
    }

    const addedEmojis = [];
    const failedEmojis = [];

    for (const e of emojiList) {
      // Match Discord emoji format <:name:id>
      const match = e.match(/<a?:([\w\d_]+):(\d+)>/);
      let name, url;

      if (match) {
        name = match[1];
        const id = match[2];
        const animated = e.startsWith("<a:");
        url = `https://cdn.discordapp.com/emojis/${id}.${animated ? "gif" : "png"}`;
      } else if (e.startsWith("http")) {
        // Direct URL case
        name = `emoji_${Date.now()}`;
        url = e;
      } else {
        failedEmojis.push(e);
        continue;
      }

      // Auto-rename duplicates
      let finalName = name;
      let counter = 1;
      while (guild.emojis.cache.find(emoji => emoji.name === finalName)) {
        finalName = `${name}_${counter++}`;
      }

      try {
        const newEmoji = await guild.emojis.create({ attachment: url, name: finalName });
        addedEmojis.push(newEmoji.toString());
      } catch (err) {
        console.error(`Failed to add emoji ${finalName}:`, err.message);
        failedEmojis.push(e);
      }
    }

    const embed = new EmbedBuilder()
      .setTitle(`${blueHeart} Emoji Steal Result`)
      .setColor("Blue")
      .setDescription(
        `${addedEmojis.length ? `✅ Added:\n${addedEmojis.join(" ")}` : ""}\n` +
        `${failedEmojis.length ? `❌ Failed:\n${failedEmojis.join(" ")}` : ""}`
      )
      .setFooter({ text: `Requested by ${user.tag}` })
      .setTimestamp();

    if (interaction) {
      await interaction.reply({ embeds: [embed] });
    } else if (message) {
      await message.reply({ embeds: [embed] });
    }
  }
};
