const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  name: "unban",
  description: "Unban a member by ID",
  data: new SlashCommandBuilder()
    .setName("unban")
    .setDescription("Unban a member")
    .addStringOption(option => 
      option.setName("userid")
        .setDescription("User ID to unban")
        .setRequired(true)),
  async execute(interaction, client) {
    const userId = interaction.options.getString("userid");

    try {
      await interaction.guild.bans.fetch(userId);
    } catch {
      return interaction.reply({ content: "This user is not banned.", ephemeral: true });
    }

    await interaction.guild.members.unban(userId);

    const embed = new EmbedBuilder()
      .setTitle("Member Unbanned")
      .setDescription(`💙 **<@${userId}>** has been unbanned!`)
      .setColor("Blue")
      .setTimestamp();

    interaction.reply({ embeds: [embed] });
  }
};

// ===== PREFIX COMMAND ======
module.exports.prefix = async (message, args) => {
  if (!message.member.permissions.has("BanMembers")) return message.reply("You cannot use this command!");
  if (!args[0]) return message.reply("Please provide a user ID.");

  try {
    const ban = await message.guild.bans.fetch(args[0]);
    if (!ban) return message.reply("This user is not banned.");
    await message.guild.members.unban(args[0]);

    const embed = new EmbedBuilder()
      .setTitle("Member Unbanned")
      .setDescription(`💙 **<@${args[0]}>** has been unbanned!`)
      .setColor("Blue")
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  } catch {
    return message.reply("User not found or not banned.");
  }
};
