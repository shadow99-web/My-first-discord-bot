const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require("discord.js");

module.exports = {
  name: "lock",
  slashData: new SlashCommandBuilder()
    .setName("lock")
    .setDescription("Lock the current channel"),

  async executePrefix(message) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels))
      return message.reply("❌ You don’t have permission to lock channels.");

    await message.channel.permissionOverwrites.edit(message.guild.id, { SendMessages: false });

    const embed = new EmbedBuilder()
      .setTitle("🔒 Channel Locked")
      .setDescription(`This channel has been locked by ${message.author}`)
      .setColor("Red");
    await message.channel.send({ embeds: [embed] });
  },

  async executeSlash(interaction) {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels))
      return interaction.reply({ content: "❌ You don’t have permission to lock channels.", ephemeral: true });

    await interaction.channel.permissionOverwrites.edit(interaction.guild.id, { SendMessages: false });

    const embed = new EmbedBuilder()
      .setTitle("🔒 Channel Locked")
      .setDescription(`This channel has been locked by ${interaction.user}`)
      .setColor("Red");
    await interaction.reply({ embeds: [embed] });
  }
};
