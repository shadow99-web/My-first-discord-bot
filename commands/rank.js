const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const Level = require("../models/Level");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("rank")
    .setDescription("Check your level and XP")
    .addUserOption(opt => opt.setName("user").setDescription("Check another user's rank")),

  name: "rank",
  aliases: ["level", "xp"],

  async execute({ interaction, message }) {
    const user = interaction
      ? interaction.options.getUser("user") || interaction.user
      : message.mentions.users.first() || message.author;

    const guildId = interaction ? interaction.guild.id : message.guild.id;
    const data = await Level.findOne({ userId: user.id, guildId }) || { xp: 0, level: 1 };

    const embed = new EmbedBuilder()
      .setColor("Blue")
      .setAuthor({ name: `${user.username}'s Rank`, iconURL: user.displayAvatarURL({ dynamic: true }) })
      .setDescription(`✎ **Level:** ${data.level}\n✮ **XP:** ${data.xp} / ${100 * data.level}`)
      .setFooter({ text: "Keep chatting to level up!" });

    if (interaction) await interaction.reply({ embeds: [embed] });
    else await message.reply({ embeds: [embed] });
  },
};
