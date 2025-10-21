const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const AntiNuke = require("../models/AntiNuke");

module.exports = {
  // both slash data and exported name for prefix loader
  name: "antinuke",
  description: "Enable or disable anti-nuke protections (admin only).",
  data: new SlashCommandBuilder()
    .setName("antinuke")
    .setDescription("Enable or disable anti-nuke protections")
    .addSubcommand(sub => sub.setName("enable").setDescription("Enable protections"))
    .addSubcommand(sub => sub.setName("disable").setDescription("Disable protections"))
    .addStringOption(opt => opt.setName("action").setDescription("Action to take on attacker: ban/demote").addChoices(
      { name: "ban", value: "ban" },
      { name: "demote", value: "demote" }
    )),

  async execute({ client, interaction, message, args, isPrefix, safeReply }) {
    // unify caller, permission checks and reply helper
    const caller = isPrefix ? message.author : interaction.user;
    const guild = isPrefix ? message.guild : interaction.guild;
    const member = isPrefix ? message.member : interaction.member;

    const reply = async (options) => {
      if (isPrefix) return message.channel.send(options).catch(()=>{});
      // interaction handler exposes safeReply; if not available fallback to .reply
      if (safeReply) return safeReply(options);
      return interaction.reply({ ...options, ephemeral: options.ephemeral ?? true }).catch(()=>{});
    };

    if (!guild) return reply({ content: "❌ This command can only be used in a server.", ephemeral: true });

    // only allow administrators / manage guild
    if (!member.permissions.has("ManageGuild") && !member.permissions.has("Administrator")) {
      return reply({ content: "❌ You must be an administrator or have Manage Server to use this.", ephemeral: true });
    }

    // parse subcommand for slash or prefix
    let sub;
    let chosenAction;
    if (isPrefix) {
      sub = args[0]?.toLowerCase();
      chosenAction = args[1]?.toLowerCase(); // optional
    } else {
      sub = interaction.options.getSubcommand();
      chosenAction = interaction.options.getString("action") || undefined;
    }

    if (!["enable","disable"].includes(sub)) {
      return reply({ content: "❌ Usage: `/antinuke enable|disable [action:ban|demote]` or `!antinuke enable|disable`", ephemeral: true });
    }

    try {
      let record = await AntiNuke.findOne({ guildId: guild.id });
      if (!record) {
        record = new AntiNuke({ guildId: guild.id });
      }

      if (sub === "enable") {
        record.enabled = true;
        if (chosenAction && ["ban","demote"].includes(chosenAction)) record.action = chosenAction;
        await record.save();

        const embed = new EmbedBuilder()
          .setTitle("💠 Anti-Nuke Enabled <a:blue_heart:1414309560231002194>")
          .setDescription(`Anti-Nuke protections are now **enabled** on this server.\nAction on detected attacker: **${record.action}**`)
          .setColor("Blue")
          .setTimestamp();

        return reply({ embeds: [embed] });
      } else {
        // disable
        record.enabled = false;
        await record.save();

        const embed = new EmbedBuilder()
          .setTitle("💤 Anti-Nuke Disabled <a:blue_heart:1414309560231002194>")
          .setDescription("Anti-Nuke protections are now **disabled**.")
          .setColor("Grey")
          .setTimestamp();

        return reply({ embeds: [embed] });
      }
    } catch (err) {
      console.error("AntiNuke command error:", err);
      return reply({ content: `❌ Something went wrong: ${err.message}`, ephemeral: true });
    }
  }
};
