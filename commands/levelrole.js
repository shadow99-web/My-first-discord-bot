const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const LevelReward = require("../models/LevelReward");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("levelrole")
    .setDescription("Set or view level rewards")
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
      sub.setName("list").setDescription("List all level rewards"))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

  async execute({ interaction, message, args, isPrefix, safeReply }) {
    const guild = interaction?.guild || message.guild;
    const guildId = guild.id;

    // ========== PREFIX MODE ==========
    if (isPrefix) {
      const sub = args[0];
      if (!sub) return safeReply("Usage: levelrole <set/remove/list>");

      // --- SET ---
      if (sub === "set") {
        const level = parseInt(args[1]);
        const role = message.mentions.roles.first();
        if (!level || !role)
          return safeReply("Usage: levelrole set <level> @role");

        await LevelReward.findOneAndUpdate(
          { guildId, level },
          { roleId: role.id },
          { upsert: true }
        );

        return safeReply(`<a:lyf_golden_stars:1441468729308479601> Users reaching **Level ${level}** will receive ${role}.`);
      }

      // --- REMOVE ---
      if (sub === "remove") {
        const level = parseInt(args[1]);
        if (!level) return safeReply("Usage: levelrole remove <level>");

        await LevelReward.deleteOne({ guildId, level });

        return safeReply(`<a:purple_verified:1439271259190988954> Removed reward for Level ${level}.`);
      }

      // --- LIST ---
      if (sub === "list") {
        const rewards = await LevelReward.find({ guildId });
        if (!rewards.length) return safeReply("No level rewards set.");

        const list = rewards
          .map(r => `• Level ${r.level} → <@&${r.roleId}>`)
          .join("\n");

        return safeReply("<:lyf_sussy:1439951940548300870> Level Rewards:\n" + list);
      }

      return safeReply("Unknown subcommand.");
    }

    // ========== SLASH MODE ==========
    const sub = interaction.options.getSubcommand();

    // --- SET ---
    if (sub === "set") {
      const level = interaction.options.getInteger("level");
      const role = interaction.options.getRole("role");

      await LevelReward.findOneAndUpdate(
        { guildId, level },
        { roleId: role.id },
        { upsert: true }
      );

      return safeReply({
        content: `<a:lyf_golden_stars:1441468729308479601> Users reaching **Level ${level}** will now receive ${role}.`,
        flags: 64,
      });
    }

    // --- REMOVE ---
    if (sub === "remove") {
      const level = interaction.options.getInteger("level");
      await LevelReward.deleteOne({ guildId, level });

      return safeReply({
        content: `<a:purple_verified:1439271259190988954> Removed level reward for **Level ${level}**.`,
        flags: 64,
      });
    }

    // --- LIST ---
    if (sub === "list") {
      const rewards = await LevelReward.find({ guildId });

      if (!rewards.length) {
        return safeReply({
          content: "No level rewards set yet.",
          flags: 64,
        });
      }

      const desc = rewards
        .map(r => `• Level ${r.level} → <@&${r.roleId}>`)
        .join("\n");

      const embed = new EmbedBuilder()
        .setTitle("<:lyf_sussy:1439951940548300870> Level Role Rewards")
        .setDescription(desc)
        .setColor("Gold");

      return safeReply({ embeds: [embed] });
    }
  },
};
