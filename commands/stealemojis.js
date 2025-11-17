// commands/stealemojis.js
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

    // 🔒 Permissions check
    if (!guild.members.me.permissions.has(PermissionsBitField.Flags.ManageEmojisAndStickers)) {
      const reply = "<a:emoji_28:1440036587596415018> I need `Manage Emojis and Stickers` permission!";
      if (interaction) return interaction.reply({ content: reply, ephemeral: true }).catch(() => {});
      if (message) return message.reply(reply).catch(() => {});
    }

    // 📩 Input handling
    const input = interaction
      ? interaction.options.getString("emojis")
      : args.join(" ");
    let emojiList = input.split(/ +/).filter(e => e);

    // ⛔ Limit safeguard
    const limit = 10;
    if (emojiList.length > limit) emojiList = emojiList.slice(0, limit);

    const addedEmojis = [];
    const failedEmojis = [];

    // If slash → defer to avoid timeout
    if (interaction) await interaction.deferReply();

    for (const e of emojiList) {
      let name, url;

      // <:name:id> format
      const match = e.match(/<a?:([\w\d_]+):(\d+)>/);
      if (match) {
        name = match[1];
        const id = match[2];
        const animated = e.startsWith("<a:");
        url = `https://cdn.discordapp.com/emojis/${id}.${animated ? "gif" : "png"}`;
      } else if (e.startsWith("http")) {
        // URL format
        name = `emoji_${Date.now()}`;
        url = e;
      } else {
        failedEmojis.push(e);
        continue;
      }

      // Auto-rename duplicates
      let finalName = name;
      let counter = 1;
      while (guild.emojis.cache.find(em => em.name === finalName)) {
        finalName = `${name}_${counter++}`;
      }

      try {
        const newEmoji = await guild.emojis.create({ attachment: url, name: finalName });
        addedEmojis.push(newEmoji.toString());
      } catch (err) {
        console.error(`❌ Failed to add emoji ${finalName}:`, err.message);
        failedEmojis.push(e);
      }
    }

    // 📊 Embed Result
    const embed = new EmbedBuilder()
      .setTitle(`${blueHeart} Emoji Steal Result`)
      .setColor("Blue")
      .setDescription(
        `${addedEmojis.length ? `<a:purple_verified:1439271259190988954> Added:\n${addedEmojis.join(" ")}` : ""}\n` +
        `${failedEmojis.length ? `❌ Failed:\n${failedEmojis.join(" ")}` : ""}`
      )
      .setFooter({ text: `Requested by ${user.tag}` })
      .setTimestamp();

    // ✅ Safe reply
    if (interaction) {
      await interaction.editReply({ embeds: [embed] }).catch(() => {});
    } else if (message) {
      await message.reply({ embeds: [embed] }).catch(() => {});
    }
  }
};
