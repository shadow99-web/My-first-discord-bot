const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("truthdare")
    .setDescription("Generate a Truth-Dare panel"),

  async execute({ interaction, message, isPrefix, safeReply }) {
    // Embed for everyone
    const embed = new EmbedBuilder()
      .setColor("Purple")
      .setTitle("🤞🏻 Truth or Dare")
      .setDescription("Click a button below to choose your challenge!")
      .setThumbnail(interaction?.client.user.displayAvatarURL())
      .setFooter({
        text: `Requested by ${isPrefix ? message.author.tag : interaction.user.tag}`,
        iconURL: isPrefix ? message.author.displayAvatarURL() : interaction.user.displayAvatarURL(),
      })
      .setTimestamp();

    // Buttons
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("td_truth")
        .setLabel("Truth")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("td_dare")
        .setLabel("Dare")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId("td_random")
        .setLabel("Random")
        .setStyle(ButtonStyle.Secondary)
    );

    // Send publicly
    if (isPrefix && message) {
      return message.channel.send({ embeds: [embed], components: [row] }).catch(() => {});
    } else if (interaction && safeReply) {
      // Don't make ephemeral
      return safeReply({ embeds: [embed], components: [row] });
    }
  },
};
