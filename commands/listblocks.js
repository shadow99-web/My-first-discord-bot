const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
} = require("discord.js");

const BlockedUser = require("../models/BlockedUser"); // ✅ Mongo model

module.exports = {
  name: "listblocked",
  description: "List all blocked users for a command",

  data: new SlashCommandBuilder()
    .setName("listblocked")
    .setDescription("Shows all users blocked from a command")
    .addStringOption(opt =>
      opt.setName("command")
        .setDescription("Command name or * for all")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(context) {
    const guild = context.isPrefix
      ? context.message.guild
      : context.interaction.guild;

    const commandName = context.isPrefix
      ? context.args[0]?.toLowerCase()
      : context.interaction.options.getString("command")?.toLowerCase();

    if (!commandName) {
      return context.isPrefix
        ? context.message.reply("❌ Usage: `!listblocked <command|*>`")
        : context.interaction.reply({
            content: "❌ Please provide a command name.",
            ephemeral: true,
          });
    }

    // 🔍 Fetch from MongoDB
    const blockedUsers = await BlockedUser.find({
      guildId: guild.id,
      command: commandName,
    });

    if (!blockedUsers.length) {
      return context.isPrefix
        ? context.message.reply(
            `✅ No users are blocked from \`${commandName}\`.`
          )
        : context.interaction.reply({
            content: `✅ No users are blocked from \`${commandName}\`.`,
            ephemeral: true,
          });
    }

    const embed = new EmbedBuilder()
      .setColor("Yellow")
      .setTitle(`🚫 Blocked Users`)
      .setDescription(
        blockedUsers
          .map(b => `<@${b.userId}>`)
          .join("\n")
      )
      .setFooter({ text: `Command: ${commandName}` })
      .setTimestamp();

    context.isPrefix
      ? context.message.reply({ embeds: [embed] })
      : context.interaction.reply({ embeds: [embed] });
  },
};
