const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
  name: "stealemojis",
  description: "Steal multiple emojis from another server or URLs",
  data: new SlashCommandBuilder()
    .setName("stealemojis")
    .setDescription("Copy multiple emojis to this server")
    .addStringOption(option =>
      option.setName("emojis")
        .setDescription("List of emojis or URLs (separated by space)")
        .setRequired(true)
    ),

  async execute({ interaction, message, args }) {
    const guild = interaction ? interaction.guild : message.guild;
    const blueHeart = "<a:blue_heart_1414309560231002194:1414309560231002194>";

    // Input
    const input = interaction ? interaction.options.getString("emojis") : args.join(" ");
    const emojiList = input.split(/ +/).filter(e => e);

    // Permission check
    if (!guild.members.me.permissions.has(PermissionFlagsBits.ManageEmojisAndStickers)) {
      const reply = "❌ I need `Manage Emojis and Stickers` permission!";
      if (interaction) return interaction.reply({ content: reply, ephemeral: true });
      else return message.reply(reply);
    }

    const addedEmojis = [];
    const failedEmojis = [];

    for (const e of emojiList) {
      let url, name;

      // Case 1: Custom emoji format <:name:id> or <a:name:id>
      const match = e.match(/<a?:([a-zA-Z0-9_]+):(\d+)>/);
      if (match) {
        name = match[1];
        const id = match[2];
        const isAnimated = e.startsWith("<a:");
        url = `https://cdn.discordapp.com/emojis/${id}.${isAnimated ? "gif" : "png"}`;
      }

      // Case 2: Direct URL
      else if (e.startsWith("http")) {
        url = e;
        const urlParts = url.split("/");
        const fileName = urlParts[urlParts.length - 1];
        name = fileName.split(".")[0] || `emoji_${Date.now()}`;
      }

      // If no valid match → fail
      else {
        failedEmojis.push(e);
        continue;
      }

      try {
        const created = await guild.emojis.create({ attachment: url, name: name });
        addedEmojis.push(created.toString());
      } catch (err) {
        console.error(`Failed to add emoji ${name}:`, err.message);
        failedEmojis.push(e);
      }
    }

    const embed = new EmbedBuilder()
      .setTitle(`${blueHeart} Emoji Steal Result`)
      .setColor("Blue")
      .setDescription(
        (addedEmojis.length ? `✅ Added:\n${addedEmojis.join(" ")}` : "") +
        (failedEmojis.length ? `\n❌ Failed:\n${failedEmojis.join(" ")}` : "") ||
        "⚠️ No valid emojis provided."
      )
      .setTimestamp();

    if (interaction) {
      await interaction.reply({ embeds: [embed] });
    } else {
      await message.reply({ embeds: [embed] });
    }
  }
};
