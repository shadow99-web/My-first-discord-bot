const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
} = require("discord.js");

const { unblockUser } = require("../utils/blockHelpers");

module.exports = {
  name: "unblockcommand",
  description: "Unblock a user from a specific command",

  data: new SlashCommandBuilder()
    .setName("unblockcommand")
    .setDescription("Unblock a user from a specific command")
    .addUserOption(opt =>
      opt.setName("user")
        .setDescription("User to unblock")
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName("command")
        .setDescription("Command name or *")
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

    // 🔐 ADMIN / DEV ONLY
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
        ? context.message.reply("🚫 Only **Admins** can use this command.")
        : context.interaction.reply({
            content: "🚫 Only **Admins** can use this command.",
            ephemeral: true,
          });
    }

    // 🛡 BOT PERMISSION CHECK (SAFE)
    const botMember = guild.members.me ?? await guild.members.fetchMe();

    if (!botMember.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return context.isPrefix
        ? context.message.reply("❌ I need `Manage Server` permission.")
        : context.interaction.reply({
            content: "❌ I need `Manage Server` permission.",
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
        ? context.message.reply("❌ Usage: `!unblockcommand @user <command>`")
        : context.interaction.reply({
            content: "❌ Please provide both user and command.",
            ephemeral: true,
          });
    }

    // 🚫 DEV PROTECTION
    if (user.id === process.env.DEV_ID) {
      return context.isPrefix
        ? context.message.reply("🚫 You cannot unblock the Developer.")
        : context.interaction.reply({
            content: "🚫 You cannot unblock the Developer.",
            ephemeral: true,
          });
    }

    // 🚫 SELF UNBLOCK PREVENTION (optional but clean)
    if (user.id === author.id) {
      return context.isPrefix
        ? context.message.reply("❌ You cannot unblock yourself.")
        : context.interaction.reply({
            content: "❌ You cannot unblock yourself.",
            ephemeral: true,
          });
    }

    // ✅ UNBLOCK USER
    const result = await unblockUser({
      guildId: guild.id,
      userId: user.id,
      command: commandName,
    });

    if (result.deletedCount === 0) {
      return context.isPrefix
        ? context.message.reply("⚠️ This user was not blocked for that command.")
        : context.interaction.reply({
            content: "⚠️ This user was not blocked for that command.",
            ephemeral: true,
          });
    }

    const embed = new EmbedBuilder()
      .setColor("Green")
      .setTitle("🔓 Command Unblocked")
      .setDescription(
        `${user} has been **unblocked** for \`${commandName}\`.`
      )
      .setFooter({ text: `Unblocked by ${author.tag}` })
      .setTimestamp();

    return context.isPrefix
      ? context.message.reply({ embeds: [embed] })
      : context.interaction.reply({ embeds: [embed] });
  },
};
