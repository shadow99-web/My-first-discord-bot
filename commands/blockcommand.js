const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
} = require("discord.js");

const { blockUser } = require("../utils/blockHelpers"); // ✅ correct import

module.exports = {
  name: "blockcommand",
  description: "Block a user from using a specific command",

  data: new SlashCommandBuilder()
    .setName("blockcommand")
    .setDescription("Block a user from a specific command")
    .addUserOption(opt =>
      opt.setName("user")
        .setDescription("User to block")
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName("command")
        .setDescription("Command name")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(context) {
    const guild = context.isPrefix
      ? context.message.guild
      : context.interaction.guild;

    const author = context.isPrefix
      ? context.message.author
      : context.interaction.user;

// 🔐 USER PERMISSION CHECK (ADMIN / DEV ONLY)
  const isDev = author.id === process.env.DEV_ID;
  const isAdmin = context.isPrefix
    ? guild.members.cache.get(author.id)?.permissions.has(
        PermissionFlagsBits.Administrator
      )
    : context.interaction.memberPermissions?.has(
        PermissionFlagsBits.Administrator
      );

  if (!isAdmin && !isDev) {
    return context.isPrefix
      ? context.message.reply("<a:a_:1455571086988017705> Only **Admins** can use this command.")
      : context.interaction.reply({
          content: "<a:a_:1455571086988017705> Only **Admins** can use this command.",
          ephemeral: true,
        });
  }
    
    // 🛡 Permission check
    if (!guild.members.me.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return context.isPrefix
        ? context.message.reply(" I need `Manage Server` permission.")
        : context.interaction.reply({
            content: " I need `Manage Server` permission.",
            ephemeral: true,
          });
    }

    const user = context.isPrefix
      ? context.message.mentions.users.first()
      : context.interaction.options.getUser("user");

    const commandName = context.isPrefix
      ? context.args[1]?.toLowerCase()
      : context.interaction.options.getString("command")?.toLowerCase();

    if (!user || !commandName) {
      return context.isPrefix
        ? context.message.reply("❌ Usage: `!blockcommand @user <command>`")
        : context.interaction.reply({
            content: "❌ Please provide both user and command.",
            ephemeral: true,
          });
    }

    if (user.id === process.env.DEV_ID) {
      return context.isPrefix
        ? context.message.reply(" You cannot block the Developer.")
        : context.interaction.reply({
            content: " You cannot block the Developer.",
            ephemeral: true,
          });
    }

const alreadyBlocked = await require("../utils/blockHelpers").isBlocked({
  guildId: guild.id,
  userId: user.id,
  command: commandName,
  member: null,
});

if (alreadyBlocked) {
  return context.isPrefix
    ? context.message.reply("⚠️ This user is already blocked from that command.")
    : context.interaction.reply({
        content: "⚠️ This user is already blocked from that command.",
        ephemeral: true,
      });
}
    
    // ✅ BLOCK USER (MongoDB)
    await blockUser({
      guildId: guild.id,
      userId: user.id,
      command: commandName,
      blockedBy: author.id,
      reason: "Blocked via blockcommand",
    });

    const embed = new EmbedBuilder()
      .setColor("Red")
      .setTitle("🔒 Command Blocked")
      .setDescription(
        `${user} has been **blocked** from using \`${commandName}\`.`
      )
      .setThumbnail(user.displayAvatarURL({ dynamic: true }))
      .setFooter({ text: `Blocked by ${author.tag}` })
      .setTimestamp();

    context.isPrefix
      ? context.message.reply({ embeds: [embed] })
      : context.interaction.reply({ embeds: [embed] });
  },
};
