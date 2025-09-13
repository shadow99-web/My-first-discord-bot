const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
  name: "stealemojis",
  description: "Steal multiple emojis from another server",
  data: new SlashCommandBuilder()
    .setName("stealemojis")
    .setDescription("Copy multiple emojis to this server")
    .addStringOption(option =>
      option.setName("emojis")
        .setDescription("List of emojis separated by space (like <:emoji:ID>)")
        .setRequired(true)
    ),

  async execute({ interaction }) {
    const guild = interaction.guild;
    const blueHeart = "<a:blue_heart_1414309560231002194:1414309560231002194>";

    const input = interaction.options.getString("emojis");
    const emojiList = input.split(/ +/).filter(e => e);

    if (!guild.members.me.permissions.has(PermissionFlagsBits.ManageEmojisAndStickers)) {
      return interaction.reply({
        content: "❌ I need `Manage Emojis and Stickers` permission!",
        ephemeral: true
      });
    }

    const addedEmojis = [];
    const failedEmojis = [];

    for (const e of emojiList) {
      const match = e.match(/<a?:\w+:(\d+)>/);
      if (!match) {
        failedEmojis.push(e);
        continue;
      }

      const id = match[1];
      const isAnimated = e.startsWith("<a:");
      const url = `https://cdn.discordapp.com/emojis/${id}.${isAnimated ? "gif" : "png"}`;

      try {
        const created = await guild.emojis.create({ attachment: url, name: `emoji_${id}` });
        addedEmojis.push(created.toString());
      } catch (err) {
        console.error(`Failed to add emoji ${id}:`, err);
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

    await interaction.reply({ embeds: [embed] });
  }
};
