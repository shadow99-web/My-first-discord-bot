// commands/pussy.js
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const axios = require("axios");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("anal")
    .setDescription("Displays a random NSFW image (only in NSFW channels)"),

  async execute(context) {
    const isSlash = !context.isPrefix;
    const channel = isSlash ? context.interaction.channel : context.message.channel;
    const user = isSlash ? context.interaction.user : context.message.author;
    const guild = isSlash ? context.interaction.guild : context.message.guild;

    // 🧩 NSFW Channel Check
    if (!channel.nsfw) {
      const embed = new EmbedBuilder()
        .setTitle("`❌` ▸ Not NSFW Channel")
        .setDescription("> This command can only be used in NSFW channels.")
        .setFooter({ text: user.username, iconURL: user.displayAvatarURL({ dynamic: true }) })
        .setColor("Red")
        .setTimestamp();

      if (isSlash)
        return context.interaction.reply({ embeds: [embed] });
      return context.message.reply({ embeds: [embed] });
    }

    try {
      // 🖼️ NSFW API (replace if blocked or non-working)
      const response = await axios.get("https://nekobot.xyz/api/image?type=anal");
      const image = response.data.message;

      if (!image) throw new Error("No image found");

      const embed = new EmbedBuilder()
        .setTitle("`🔞` ▸ NSFW Pussy Image")
        .setImage(image)
        .setFooter({ text: guild?.name || "NSFW Command", iconURL: guild?.iconURL({ dynamic: true }) })
        .setColor("Random")
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setEmoji("📎")
          .setLabel(" ▸ Link")
          .setStyle(ButtonStyle.Link)
          .setURL(image)
      );

      if (isSlash)
        return context.interaction.reply({ embeds: [embed], components: [row] });
      return context.message.reply({ embeds: [embed], components: [row] });

    } catch (err) {
      console.error("Error fetching NSFW image:", err);
      const embed = new EmbedBuilder()
        .setTitle("`❌` ▸ Error Occurred")
        .setDescription("> An error occurred while fetching the image. Please try again later.")
        .setFooter({ text: user.username, iconURL: user.displayAvatarURL({ dynamic: true }) })
        .setColor("Red")
        .setTimestamp();

      if (isSlash)
        return context.interaction.reply({ embeds: [embed] });
      return context.message.reply({ embeds: [embed] });
    }
  },
};
