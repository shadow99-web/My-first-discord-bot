const { 
  SlashCommandBuilder, 
  PermissionFlagsBits, 
  EmbedBuilder,
  InteractionFlags 
} = require("discord.js");

const LevelReward = require("../models/LevelReward");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("levelrole")
    .setDescription("Set, remove, or view level rewards")
    .addSubcommand(sub =>
      sub
        .setName("set")
        .setDescription("Set a role reward for a level")
        .addIntegerOption(opt =>
          opt.setName("level").setDescription("Level number").setRequired(true)
        )
        .addRoleOption(opt =>
          opt.setName("role").setDescription("Role to give").setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName("remove")
        .setDescription("Remove a level reward")
        .addIntegerOption(opt =>
          opt.setName("level").setDescription("Level number").setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName("list").setDescription("List all level rewards")
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

  async execute(interaction) {
    // ---------- Guild Check ----------
    if (!interaction.guild) {
      return interaction.reply({
        content: "❌ This command can only be used inside a server.",
        flags: InteractionFlags.Ephemeral
      });
    }

    const guildId = interaction.guild.id;
    const sub = interaction.options.getSubcommand();

    try {
      // ================= SET =================
      if (sub === "set") {
        const level = interaction.options.getInteger("level");
        const role = interaction.options.getRole("role");

        // Bot must have role position & manage roles perm
        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) {
          return interaction.reply({
            content: "❌ I don't have permission to manage roles.",
            flags: InteractionFlags.Ephemeral
          });
        }

        await LevelReward.findOneAndUpdate(
          { guildId, level },
          { roleId: role.id },
          { upsert: true }
        );

        return interaction.reply({
          content: `🎉 Users who reach **Level ${level}** will now receive the role ${role}.`,
          flags: InteractionFlags.Ephemeral
        });
      }

      // ================= REMOVE =================
      if (sub === "remove") {
        const level = interaction.options.getInteger("level");

        await LevelReward.deleteOne({ guildId, level });

        return interaction.reply({
          content: `🗑️ Removed level reward for **Level ${level}**.`,
          flags: InteractionFlags.Ephemeral
        });
      }

      // ================= LIST =================
      if (sub === "list") {
        const rewards = await LevelReward.find({ guildId });

        if (!rewards.length) {
          return interaction.reply({
            content: "📭 No level rewards set yet.",
            flags: InteractionFlags.Ephemeral
          });
        }

        const desc = rewards
          .map(r => `• **Level ${r.level}** → <@&${r.roleId}>`)
          .join("\n");

        const embed = new EmbedBuilder()
          .setTitle("🏆 Level Role Rewards")
          .setDescription(desc)
          .setColor("Gold");

        return interaction.reply({ embeds: [embed] });
      }

    } catch (err) {
      console.error("❌ Error in levelrole command:", err);
      return interaction.reply({
        content: `❌ Something went wrong.\n\`\`\`${err.message}\`\`\``,
        flags: InteractionFlags.Ephemeral
      });
    }
  },
};
