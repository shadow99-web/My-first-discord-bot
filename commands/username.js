const { EmbedBuilder } = require("discord.js");

module.exports = {
  name: "username",
  description: "Get a user's display name in copyable format.",

  options: [
    {
      name: "user",
      type: 6, // USER
      description: "The user to fetch (optional, defaults to you)",
      required: false,
    },
  ],

  async execute({ client, interaction, message, args, isPrefix }) {
    let targetUser;

    if (isPrefix) {
      // Prefix: !username @user OR !username <id>
      targetUser = message.mentions.users.first();

      if (!targetUser && args[0]) {
        try {
          targetUser = await client.users.fetch(args[0]);
        } catch {}
      }

      if (!targetUser) {
        targetUser = message.author; // fallback: yourself
      }
    } else {
      // Slash: /username user:@someone
      targetUser = interaction.options.getUser("user") || interaction.user;
    }

    const guild = interaction ? interaction.guild : message.guild;
    const member = guild.members.cache.get(targetUser.id);
    const displayName = member?.nickname || targetUser.username;

    const embed = new EmbedBuilder()
      .setTitle("📛 Display Name")
      .setDescription(`\`\`\`${displayName}\`\`\``) // copyable
      .setColor("Blue")
      .setFooter({
        text: `Requested by ${isPrefix ? message.author.tag : interaction.user.tag}`,
      });

    if (isPrefix) {
      await message.reply({ embeds: [embed] }).catch(() => {});
    } else {
      await interaction.reply({ embeds: [embed] }).catch(() => {});
    }
  },
};
