const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
} = require("discord.js");

module.exports = {
  name: "inactive",
  data: new SlashCommandBuilder()
    .setName("inactive")
    .setDescription("✔ Manage inactive members in your server")
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addSubcommand(sub =>
      sub
        .setName("check")
        .setDescription("Check who’s inactive for a given number of days")
        .addIntegerOption(opt =>
          opt
            .setName("days")
            .setDescription("Inactive for X days (default: 30)")
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName("remove")
        .setDescription("Remove all inactive users (for given days)")
        .addIntegerOption(opt =>
          opt
            .setName("days")
            .setDescription("Inactive for X days (default: 30)")
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName("kick")
        .setDescription("Kick a specific inactive user")
        .addUserOption(opt =>
          opt
            .setName("user")
            .setDescription("User to remove")
            .setRequired(true)
        )
    ),

  // =============== SLASH EXECUTION =================
  async execute(interaction) {
    if (!interaction.isChatInputCommand()) return;
    const sub = interaction.options.getSubcommand();
    const days = interaction.options.getInteger("days") || 30;
    const guild = interaction.guild;
    const now = Date.now();

    await interaction.deferReply({ ephemeral: true });

    if (sub === "check") {
      const inactive = await findInactiveMembers(guild, days, now);
      if (!inactive.length)
        return interaction.followUp(`✅ No inactive users found in the last ${days} days.`);

      const embed = new EmbedBuilder()
        .setTitle(`<a:blue_heart:1414309560231002194> Inactive Members`)
        .setDescription(
          inactive
            .slice(0, 15)
            .map(m => `• ${m.user.tag} — joined <t:${Math.floor(m.joinedTimestamp / 1000)}:R>`)
            .join("\n")
        )
        .setColor("Blurple")
        .setFooter({ text: `Found ${inactive.length} inactive members` });

      return interaction.followUp({ embeds: [embed] });
    }

    if (sub === "remove") {
      const inactive = await findInactiveMembers(guild, days, now);
      if (!inactive.length)
        return interaction.followUp(`✅ No inactive members older than ${days} days.`);

      let kicked = 0;
      for (const member of inactive) {
        if (!member.kickable) continue;
        await member.kick(`Inactive for ${days}+ days`).catch(() => {});
        kicked++;
      }

      return interaction.followUp(
        `🧹 Kicked ${kicked}/${inactive.length} inactive users (>${days} days).`
      );
    }

    if (sub === "kick") {
      const user = interaction.options.getUser("user");
      const member = await guild.members.fetch(user.id).catch(() => null);
      if (!member) return interaction.followUp("❌ That user isn’t in this server.");

      if (!member.kickable)
        return interaction.followUp("⚠️ I can’t kick that user (insufficient perms).");

      await member.kick("Manual inactive cleanup");
      return interaction.followUp(`✅ ${user.tag} has been kicked.`);
    }
  },

  // =============== PREFIX EXECUTION =================
  async executePrefix(message, args) {
    const sub = args[0];
    const days = parseInt(args[1]) || 30;
    const guild = message.guild;
    const now = Date.now();

    if (!message.member.permissions.has(PermissionFlagsBits.KickMembers))
      return message.reply("⚠️ You don’t have permission to use this.");

    if (!sub)
      return message.reply("Usage: `!inactive check [days]` | `!inactive remove [days]` | `!inactive kick @user`");

    if (sub === "check") {
      const inactive = await findInactiveMembers(guild, days, now);
      if (!inactive.length)
        return message.reply(`✅ No inactive users found in ${days} days.`);

      const embed = new EmbedBuilder()
        .setTitle(`<a:blue_heart:1414309560231002194> Inactive Members`)
        .setDescription(
          inactive
            .slice(0, 15)
            .map(m => `• ${m.user.tag} — joined <t:${Math.floor(m.joinedTimestamp / 1000)}:R>`)
            .join("\n")
        )
        .setColor("Blurple")
        .setFooter({ text: `Found ${inactive.length} inactive members` });

      return message.reply({ embeds: [embed] });
    }

    if (sub === "remove") {
      const inactive = await findInactiveMembers(guild, days, now);
      if (!inactive.length)
        return message.reply(`✅ No inactive members older than ${days} days.`);

      let kicked = 0;
      for (const member of inactive) {
        if (!member.kickable) continue;
        await member.kick(`Inactive for ${days}+ days`).catch(() => {});
        kicked++;
      }

      return message.reply(`🧹 Kicked ${kicked}/${inactive.length} inactive users (>${days} days).`);
    }

    if (sub === "kick") {
      const user = message.mentions.users.first() || (await guild.members.fetch(args[1]).catch(() => null));
      if (!user) return message.reply("❌ Please mention or provide a valid user ID.");
      const member = await guild.members.fetch(user.id).catch(() => null);
      if (!member) return message.reply("⚠️ That user isn’t in the server.");

      await member.kick("Manual inactive cleanup");
      return message.reply(`✅ ${user.tag} has been kicked.`);
    }
  },
};

// =============== HELPER FUNCTION =================
async function findInactiveMembers(guild, days, now) {
  const members = await guild.members.fetch();
  const threshold = now - days * 24 * 60 * 60 * 1000;

  return members
    .filter(m => !m.user.bot)
    .filter(m => m.joinedTimestamp < threshold && !m.voice.channel)
    .map(m => m);
}
