const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
} = require("discord.js");

const { setNoPrefix, getNoPrefix } = require("../handlers/noPrefixHandler");

module.exports = {
  name: "noprefix",
  description: "Enable or disable no-prefix commands",

  // 🔹 SLASH COMMAND DATA
  data: new SlashCommandBuilder()
    .setName("noprefix")
    .setDescription("Enable or disable no-prefix commands")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(opt =>
      opt
        .setName("mode")
        .setDescription("Enable or disable")
        .setRequired(true)
        .addChoices(
          { name: "Enable", value: "on" },
          { name: "Disable", value: "off" }
        )
    ),

  // 🔹 UNIFIED EXECUTE
  async execute({ interaction, message, args, isPrefix }) {
    const guild = interaction?.guild || message?.guild;
    if (!guild) return;

    const member = interaction?.member || message?.member;
    const user = interaction?.user || message?.author;

    // 🔐 Permission check (double safety)
    if (
      !member.permissions.has(PermissionFlagsBits.Administrator) &&
      guild.ownerId !== user.id
    ) {
      const msg = "❌ Only **Admins or Server Owner** can use this.";
      return isPrefix
        ? message.reply(msg)
        : interaction.reply({ content: msg, flags: MessageFlags.Ephemeral });
    }

    // 🔹 Get mode
    const mode = isPrefix
      ? args[0]?.toLowerCase()
      : interaction.options.getString("mode");

    if (!["on", "off"].includes(mode)) {
      const msg = "Usage: `!noprefix on` or `!noprefix off`";
      return isPrefix
        ? message.reply(msg)
        : interaction.reply({ content: msg, flags: MessageFlags.Ephemeral });
    }

    const enabled = mode === "on";
    await setNoPrefix(guild.id, enabled);

    const reply = enabled
      ? "💛 **No-prefix commands ENABLED**"
      : "✋ **No-prefix commands DISABLED**";

    return isPrefix
      ? message.reply(reply)
      : interaction.reply({ content: reply, flags: MessageFlags.Ephemeral });
  },
};
