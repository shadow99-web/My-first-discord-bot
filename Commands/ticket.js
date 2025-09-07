const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField, ChannelType } = require("discord.js");

module.exports = {
  name: "ticket",
  slashData: new SlashCommandBuilder()
    .setName("ticket")
    .setDescription("Create a support ticket"),

  async executePrefix(message) {
    const ticketChannel = await message.guild.channels.create({
      name: `ticket-${message.author.username}`,
      type: ChannelType.GuildText,
      permissionOverwrites: [
        {
          id: message.guild.id,
          deny: [PermissionsBitField.Flags.ViewChannel],
        },
        {
          id: message.author.id,
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
        },
      ],
    });

    const embed = new EmbedBuilder()
      .setTitle("🎫 Ticket Created")
      .setDescription(`Hello ${message.author}, our team will assist you soon in ${ticketChannel}`)
      .setColor("Orange");

    await message.reply({ embeds: [embed] });
  },

  async executeSlash(interaction) {
    const ticketChannel = await interaction.guild.channels.create({
      name: `ticket-${interaction.user.username}`,
      type: ChannelType.GuildText,
      permissionOverwrites: [
        {
          id: interaction.guild.id,
          deny: [PermissionsBitField.Flags.ViewChannel],
        },
        {
          id: interaction.user.id,
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
        },
      ],
    });

    const embed = new EmbedBuilder()
      .setTitle("🎫 Ticket Created")
      .setDescription(`Hello ${interaction.user}, our team will assist you soon in ${ticketChannel}`)
      .setColor("Orange");

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
