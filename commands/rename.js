// commands/rename.js
const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require("discord.js");

module.exports = {
  name: "rename",
  description: "Rename a channel or role (Admins only)",
  usage: "!rename <channel|role> <new_name>",

  slash: new SlashCommandBuilder()
    .setName("rename")
    .setDescription("Rename a channel or role")
    .addSubcommand(sub =>
      sub.setName("channel")
        .setDescription("Rename the current channel")
        .addStringOption(option =>
          option.setName("new_name")
            .setDescription("New name for the channel")
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName("role")
        .setDescription("Rename a role")
        .addRoleOption(option =>
          option.setName("role")
            .setDescription("Role to rename")
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName("new_name")
            .setDescription("New name for the role")
            .setRequired(true)
        )
    ),

  async execute({ client, message, interaction, args, isPrefix }) {
    const blueHeart = "<a:blue_heart:1414309560231002194>";
    let subcommand, newName, role;

    try {
      // ------- Common Permission Check -------
      const member = isPrefix ? message.member : interaction.member;
      if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return isPrefix
          ? message.reply("🚫 You don’t have permission to use this command.")
          : interaction.reply({ content: "🚫 You don’t have permission to use this command.", ephemeral: true });
      }

      const botMember = await (isPrefix ? message.guild.members.fetchMe() : interaction.guild.members.fetchMe());

      // ------- PREFIX -------
      if (isPrefix) {
        const type = args.shift();
        if (!["channel", "role"].includes(type)) {
          return message.reply("❌ Usage: `!rename channel <new_name>` or `!rename role @role <new_name>`");
        }

        if (type === "channel") {
          if (!botMember.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
            return message.reply("⚠️ I don’t have **Manage Channels** permission.");
          }

          newName = args.join(" ");
          if (!newName) return message.reply("❌ Please provide a new name.");
          await message.channel.setName(newName);

          return message.reply({
            embeds: [new EmbedBuilder().setColor("Blue").setDescription(`${blueHeart} Channel renamed to **${newName}** ✅`)]
          });

        } else if (type === "role") {
          role = message.mentions.roles.first();
          if (!role) return message.reply("❌ Please mention a role to rename.");
          newName = args.slice(1).join(" ");
          if (!newName) return message.reply("❌ Please provide a new name.");

          if (!botMember.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
            return message.reply("⚠️ I don’t have **Manage Roles** permission.");
          }

          if (role.position >= botMember.roles.highest.position) {
            return message.reply("⚠️ I can’t rename this role because it’s higher or equal to my highest role.");
          }

          await role.setName(newName);

          return message.reply({
            embeds: [new EmbedBuilder().setColor("Blue").setDescription(`${blueHeart} Role renamed to **${newName}** ✅`)]
          });
        }

      } else {
        // ------- SLASH -------
        subcommand = interaction.options.getSubcommand();

        if (subcommand === "channel") {
          if (!botMember.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
            return interaction.reply({ content: "⚠️ I don’t have **Manage Channels** permission.", ephemeral: true });
          }

          newName = interaction.options.getString("new_name");
          await interaction.channel.setName(newName);

          return interaction.reply({
            embeds: [new EmbedBuilder().setColor("Blue").setDescription(`${blueHeart} Channel renamed to **${newName}** ✅`)]
          });

        } else if (subcommand === "role") {
          role = interaction.options.getRole("role");
          newName = interaction.options.getString("new_name");

          if (!botMember.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
            return interaction.reply({ content: "⚠️ I don’t have **Manage Roles** permission.", ephemeral: true });
          }

          if (role.position >= botMember.roles.highest.position) {
            return interaction.reply({ content: "⚠️ I can’t rename this role because it’s higher or equal to my highest role.", ephemeral: true });
          }

          await role.setName(newName);

          return interaction.reply({
            embeds: [new EmbedBuilder().setColor("Blue").setDescription(`${blueHeart} Role renamed to **${newName}** ✅`)]
          });
        }
      }
    } catch (err) {
      console.error("❌ Rename command failed:", err);
      if (isPrefix) {
        return message.reply("⚠️ Failed to rename. Do I have permission?");
      } else {
        return interaction.reply({ content: "⚠️ Failed to rename. Do I have permission?", ephemeral: true });
      }
    }
  }
};
