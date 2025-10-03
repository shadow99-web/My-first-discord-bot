const { EmbedBuilder } = require("discord.js");

module.exports = {
  name: "username",
  description: "Get a user's display name in copyable format.",

  options: [
    {
      name: "user",
      type: 6, // USER type
      description: "The user to get the display name of",
      required: true,
    },
  ],

  async execute({ client, interaction, message, args, isPrefix }) {
    let targetUser;

    if (isPrefix) {
      // Prefix command usage: !username @user
      targetUser = message.mentions.users.first();
      if (!targetUser && args[0]) {
        try {
          targetUser = await client.users.fetch(args[0]);
        } catch {}
      }
      if (!targetUser) return message.reply("❌ Please mention a valid user!");
    } else {
      // Slash command usage: /username user:@user
      targetUser = interaction.options.getUser("user");
    }

    const member = interaction
      ? interaction.guild.members.cache.get(targetUser.id)
      : message.guild.members.cache.get(targetUser.id);

    const displayName = member?.nickname || targetUser.username;

    const embed = new EmbedBuilder()
      .setTitle("📛 Display Name")
      .setDescription(`\`\`\`${displayName}\`\`\``) // copyable format
      .setColor("Blue")
      .setFooter({ text: `Requested by ${isPrefix ? message.author.tag : interaction.user.tag}` });

    if (isPrefix) {
      await message.reply({ embeds: [embed] });
    } else {
      await interaction.reply({ embeds: [embed], ephemeral: false });
    }
  },
};
