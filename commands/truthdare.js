const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("truthdare")
    .setDescription("Generate a Truth-Dare panel"),

  async execute({ interaction, message, isPrefix, safeReply }) {
  const requester = isPrefix ? message.author : interaction.user;
  const botUser = isPrefix
    ? message.client.user
    : interaction.client.user;

  const embed = new EmbedBuilder()
    .setColor("Purple")
    .setTitle("<:k_:1455575860697497612>  Truth or Dare")
    .setDescription("Click a button below to choose your challenge!")
    .setThumbnail(botUser.displayAvatarURL())
    .setFooter({
      text: `Requested by ${requester.tag}`,
      iconURL: requester.displayAvatarURL(),
    })
    .setTimestamp();

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

  if (isPrefix && message) {
    return message.channel.send({ embeds: [embed], components: [row] });
  }

  return safeReply({ embeds: [embed], components: [row] });
}
  },
};
