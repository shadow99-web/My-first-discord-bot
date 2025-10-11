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

  async execute(interaction) {
    const guildId = interaction.guild.id;
    const sub = interaction.options.getSubcommand();

    if (sub === "set") {
      const level = interaction.options.getInteger("level");
      const role = interaction.options.getRole("role");

      await LevelReward.findOneAndUpdate(
        { guildId, level },
        { roleId: role.id },
        { upsert: true }
      );

      return interaction.reply({
        content: `❤‍🩹 Users reaching **Level ${level}** will now get the role ${role}.`,
        ephemeral: true,
      });
    }

    if (sub === "remove") {
      const level = interaction.options.getInteger("level");
      await LevelReward.deleteOne({ guildId, level });
      return interaction.reply({
        content: `💖 Removed level reward for Level ${level}.`,
        ephemeral: true,
      });
    }

    if (sub === "list") {
      const rewards = await LevelReward.find({ guildId });
      if (!rewards.length)
        return interaction.reply("No level rewards set yet.");

      const desc = rewards
        .map(r => `• Level ${r.level} → <@&${r.roleId}>`)
        .join("\n");

      const embed = new EmbedBuilder()
        .setTitle("🙌 Level Role Rewards")
        .setDescription(desc)
        .setColor("Gold");

      return interaction.reply({ embeds: [embed] });
    }
  },
};
