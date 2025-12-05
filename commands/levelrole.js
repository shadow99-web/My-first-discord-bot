const { 
  SlashCommandBuilder, 
  PermissionFlagsBits, 
  EmbedBuilder 
} = require("discord.js");
const LevelReward = require("../models/LevelReward");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("levelrole")
    .setDescription("Set or view level reward roles")
    .addSubcommand(sub =>
      sub
        .setName("set")
        .setDescription("Set a role reward for a level")
        .addIntegerOption(opt =>
          opt.setName("level")
            .setDescription("Level number")
            .setRequired(true)
        )
        .addRoleOption(opt =>
          opt.setName("role")
            .setDescription("Role to give")
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName("remove")
        .setDescription("Remove a level reward")
        .addIntegerOption(opt =>
          opt.setName("level")
            .setDescription("Level number")
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName("list")
        .setDescription("List all level reward roles")
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

  async execute(interaction) {

    // 🔒 Prevent DM crash
    if (!interaction.inGuild()) {
      return interaction.reply({
        content: "❌ This command can only be used inside a server.",
        ephemeral: true,
      });
    }

    const guild = interaction.guild;
    const guildId = guild.id;
    const sub = interaction.options.getSubcommand();

    // ================================
    // 🔹 SET LEVEL ROLE
    // ================================
    if (sub === "set") {
      const level = interaction.options.getInteger("level");
      const role = interaction.options.getRole("role");

      if (!role) {
        return interaction.reply({
          content: "❌ Invalid role.",
          ephemeral: true,
        });
      }

      // Save (create or update)
      await LevelReward.findOneAndUpdate(
        { guildId, level },
        { roleId: role.id },
        { upsert: true }
      );

      return interaction.reply({
        content: `✨ Users who reach **Level ${level}** will now receive the role ${role}.`,
        ephemeral: true,
      });
    }

    // ================================
    // 🔹 REMOVE LEVEL ROLE
    // ================================
    if (sub === "remove") {
      const level = interaction.options.getInteger("level");
      const deleted = await LevelReward.deleteOne({ guildId, level });

      if (deleted.deletedCount === 0) {
        return interaction.reply({
          content: `⚠️ No reward was set for Level ${level}.`,
          ephemeral: true,
        });
      }

      return interaction.reply({
        content: `🗑️ Removed reward for **Level ${level}**.`,
        ephemeral: true,
      });
    }

    // ================================
    // 🔹 LIST LEVEL ROLES
    // ================================
    if (sub === "list") {
      const rewards = await LevelReward.find({ guildId }).sort({ level: 1 });

      if (!rewards.length) {
        return interaction.reply({
          content: "📭 No level rewards set yet.",
          ephemeral: true,
        });
      }

      const desc = rewards
        .map(r => `• **Level ${r.level}** → <@&${r.roleId}>`)
        .join("\n");

      const embed = new EmbedBuilder()
        .setTitle("🎖️ Level Role Rewards")
        .setDescription(desc)
        .setColor("Gold");

      return interaction.reply({ embeds: [embed] });
    }
  },
};
