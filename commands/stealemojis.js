const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

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

  async execute({ interaction, client }) {
    const guild = interaction.guild;
    const blueHeart = "<a:blue_heart_1414309560231002194:1414309560231002194>";

    const input = interaction.options.getString("emojis");
    const emojiList = input.split(/ +/).filter(e => e);

    if (!guild.members.me.permissions.has("ManageEmojisAndStickers")) {
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
      const emoji = client.emojis.cache.get(id);
      if (!emoji) {
        failedEmojis.push(e);
        continue;
      }

      try {
        const url = emoji.url;
        await guild.emojis.create({ attachment: url, name: emoji.name });
        addedEmojis.push(emoji.toString());
      } catch (err) {
        console.error(`Failed to add emoji ${emoji.name}:`, err);
        failedEmojis.push(emoji.toString());
      }
    }

    const embed = new EmbedBuilder()
      .setTitle(`${blueHeart} Emoji Steal Result`)
      .setColor("Blue")
      .setDescription(
        `${addedEmojis.length ? `✅ Added:\n${addedEmojis.join(" ")}` : ""}\n` +
        `${failedEmojis.length ? `❌ Failed:\n${failedEmojis.join(" ")}` : ""}`
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
