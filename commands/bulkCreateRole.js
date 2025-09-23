// commands/bulkCreateRole.js
const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} = require("discord.js");

const BLUE_HEART = "<a:blue_heart:1414309560231002194>";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("bulkcreaterole")
    .setDescription("Create multiple roles at once with templates and permissions")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addStringOption((option) =>
      option
        .setName("roles")
        .setDescription("Comma-separated role names (e.g. Warrior,Guardian,Mage)")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("permissions")
        .setDescription("Choose permissions for the roles")
        .setRequired(false)
        .addChoices(
          { name: "No special perms", value: "none" },
          { name: "Administrator", value: "ADMINISTRATOR" },
          { name: "Manage Server", value: "MANAGE_GUILD" },
          { name: "Manage Channels", value: "MANAGE_CHANNELS" },
          { name: "Manage Roles", value: "MANAGE_ROLES" },
          { name: "Kick Members", value: "KICK_MEMBERS" },
          { name: "Ban Members", value: "BAN_MEMBERS" },
          { name: "Manage Messages", value: "MANAGE_MESSAGES" },
          { name: "Mention Everyone", value: "MENTION_EVERYONE" }
        )
    ),

  name: "bulkcreaterole",
  aliases: ["bcr"],

  async execute(ctx) {
    const { interaction, message, isPrefix } = ctx;

    // -------- Safe reply helper --------
    const safeSend = async (options) => {
      if (isPrefix && message) return message.channel.send(options);
      if (interaction) {
        if (interaction.replied || interaction.deferred) {
          return interaction.followUp(options);
        }
        return interaction.reply(options);
      }
    };

    // -------- Permission check --------
    const member = isPrefix ? message.member : interaction.member;
    if (!member.permissions.has(PermissionFlagsBits.ManageRoles)) {
      return safeSend({
        embeds: [
          new EmbedBuilder()
            .setColor("Red")
            .setDescription("❌ You don’t have permission to manage roles."),
        ],
        ephemeral: !isPrefix,
      });
    }

    // -------- Get roles input --------
    const input = isPrefix
      ? args.join(" ") // prefix: !bulkcreaterole Warrior,Guardian,Mage
      : interaction.options.getString("roles");

    const roleNames = input.split(",").map((r) => r.trim()).filter(Boolean);

    if (roleNames.length === 0) {
      return safeSend({ content: "⚠️ Please provide at least one role name." });
    }

    // -------- Permissions --------
    let chosenPerm = isPrefix
      ? null
      : interaction.options.getString("permissions");

    let perms = [];
    if (chosenPerm && chosenPerm !== "none") {
      if (PermissionFlagsBits[chosenPerm]) {
        perms = [PermissionFlagsBits[chosenPerm]];
      }
    }

    // -------- Create roles --------
    const created = [];
    for (const roleName of roleNames) {
      try {
        const role = await (interaction?.guild || message.guild).roles.create({
          name: `╰›。🜲┆${roleName}┆🜲`, // template applied
          permissions: perms,
          reason: "Bulk role creation",
        });
        created.push(role.name);
      } catch (err) {
        console.error(`❌ Failed to create role ${roleName}:`, err);
      }
    }

    // -------- Send result --------
    return safeSend({
      embeds: [
        new EmbedBuilder()
          .setColor("Blue")
          .setTitle(`${BLUE_HEART} Bulk Role Creation`)
          .setDescription(
            created.length > 0
              ? `✅ Created roles:\n${created.map((r) => `- ${r}`).join("\n")}`
              : "⚠️ No roles were created."
          )
          .setTimestamp(),
      ],
    });
  },
};
