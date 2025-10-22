const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const AntiNuke = require("../models/AntiNuke");

module.exports = {
  name: "antinuke",
  description: "Enable or disable Anti-Nuke protections (server-Owner only).",
  data: new SlashCommandBuilder()
    .setName("antinuke")
    .setDescription("Enable or disable Anti-Nuke protections (server-Owner only)")
    .addSubcommand(sub =>
      sub
        .setName("enable")
        .setDescription("Enable Anti-Nuke protections")
        .addStringOption(opt =>
          opt
            .setName("action")
            .setDescription("Action to take against attacker: ban/demote")
            .addChoices(
              { name: "ban", value: "ban" },
              { name: "demote", value: "demote" }
            )
        )
    )
    .addSubcommand(sub =>
      sub
        .setName("disable")
        .setDescription("Disable Anti-Nuke protections")
    ),

  async execute({ client, interaction, message, args, isPrefix, safeReply }) {
    const guild = isPrefix ? message.guild : interaction.guild;
    const user = isPrefix ? message.author : interaction.user;

    const reply = async (options) => {
      if (isPrefix) return message.channel.send(options).catch(() => {});
      if (safeReply) return safeReply(options);
      return interaction.reply({ ...options, ephemeral: options.ephemeral ?? true }).catch(() => {});
    };

    if (!guild)
      return reply({ content: "❌ This command can only be used in a server.", ephemeral: true });

    if (guild.ownerId !== user.id) {
      return reply({
        content: "🚫 Only the **Server Owner** can enable or disable Anti-Nuke.",
        ephemeral: true,
      });
    }

    let sub, chosenAction;
    if (isPrefix) {
      sub = args[0]?.toLowerCase();
      chosenAction = args[1]?.toLowerCase();
    } else {
      sub = interaction.options.getSubcommand();
      chosenAction = interaction.options.getString("action");
    }

    if (!["enable", "disable"].includes(sub)) {
      return reply({
        content: "❌ Usage: `/antinuke enable|disable [action:ban|demote]` or `!antinuke enable|disable`",
        ephemeral: true,
      });
    }

    try {
      let record = await AntiNuke.findOne({ guildId: guild.id });
      if (!record) record = new AntiNuke({ guildId: guild.id });

      if (sub === "enable") {
        record.enabled = true;
        record.action = ["ban", "demote"].includes(chosenAction)
          ? chosenAction
          : "ban";
        await record.save();

        const embed = new EmbedBuilder()
          .setTitle("💠 Anti-Nuke Enabled <a:blue_heart:1414309560231002194>")
          .setDescription(
            `✅ Anti-Nuke is now **enabled**.\n` +
            `Only **you (Server Owner)** can create, delete, or modify channels/roles.\n\n` +
            `Action on attackers: **${record.action.toUpperCase()}**`
          )
          .setColor("Blue")
          .setTimestamp();

        return reply({ embeds: [embed] });
      } else {
        record.enabled = false;
        await record.save();

        const embed = new EmbedBuilder()
          .setTitle("💤 Anti-Nuke Disabled <a:blue_heart:1414309560231002194>")
          .setDescription("❌ Anti-Nuke protections are now **disabled**.")
          .setColor("Grey")
          .setTimestamp();

        return reply({ embeds: [embed] });
      }
    } catch (err) {
      console.error("AntiNuke command error:", err);
      return reply({ content: `❌ Something went wrong: ${err.message}`, ephemeral: true });
    }
  },
};
