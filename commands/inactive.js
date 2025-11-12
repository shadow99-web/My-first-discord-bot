const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  InteractionType,
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

  async execute(ctx) {
    // 🧠 Detect if this is a Slash Interaction or Prefix Message
    const isSlash = ctx.type && ctx.type === InteractionType.ApplicationCommand;
    const interaction = isSlash ? ctx : null;
    const message = !isSlash ? ctx : null;

    const guild = interaction ? interaction.guild : message.guild;
    const member = interaction ? interaction.member : message.member;
    const channel = interaction ? interaction.channel : message.channel;

    if (!member.permissions.has(PermissionFlagsBits.KickMembers))
      return interaction
        ? interaction.reply({ content: "⚠️ You don’t have permission.", flags: 64 })
        : message.reply("⚠️ You don’t have permission.");

    const now = Date.now();
    let sub, days;

    if (interaction) {
      sub = interaction.options.getSubcommand();
      days = interaction.options.getInteger("days") || 30;
      await interaction.deferReply({ flags: 64 }); // replaces deprecated ephemeral
    } else {
      sub = (message.content.split(" ")[1] || "").toLowerCase();
      days = parseInt(message.content.split(" ")[2]) || 30;
    }

    // 🧩 Helper function
    const inactive = await findInactiveMembers(guild, days, now);

    // 💠 Subcommand: CHECK
    if (sub === "check") {
      if (!inactive.length) {
        const text = `✅ No inactive users found in the last ${days} days.`;
        return interaction
          ? interaction.followUp({ content: text })
          : message.reply(text);
      }

      const embed = new EmbedBuilder()
        .setTitle(`<a:blue_heart:1414309560231002194> Inactive Members`)
        .setDescription(
          inactive
            .slice(0, 15)
            .map(
              m => `• ${m.user.tag} — joined <t:${Math.floor(m.joinedTimestamp / 1000)}:R>`
            )
            .join("\n")
        )
        .setColor("Blurple")
        .setFooter({ text: `Found ${inactive.length} inactive members` });

      return interaction
        ? interaction.followUp({ embeds: [embed] })
        : message.reply({ embeds: [embed] });
    }

    // 💠 Subcommand: REMOVE
    if (sub === "remove") {
      if (!inactive.length) {
        const text = `✅ No inactive members older than ${days} days.`;
        return interaction
          ? interaction.followUp({ content: text })
          : message.reply(text);
      }

      let kicked = 0;
      for (const m of inactive) {
        if (!m.kickable) continue;
        await m.kick(`Inactive for ${days}+ days`).catch(() => {});
        kicked++;
      }

      const text = `🧹 Kicked ${kicked}/${inactive.length} inactive users (>${days} days).`;
      return interaction
        ? interaction.followUp({ content: text })
        : message.reply(text);
    }

    // 💠 Subcommand: KICK
    if (sub === "kick") {
      const user =
        interaction?.options.getUser("user") ||
        message.mentions.users.first() ||
        (await guild.members.fetch(message.content.split(" ")[2]).catch(() => null));

      if (!user)
        return interaction
          ? interaction.followUp("❌ Please specify a valid user.")
          : message.reply("❌ Please specify a valid user.");

      const target = await guild.members.fetch(user.id).catch(() => null);
      if (!target)
        return interaction
          ? interaction.followUp("⚠️ That user isn’t in this server.")
          : message.reply("⚠️ That user isn’t in this server.");

      if (!target.kickable)
        return interaction
          ? interaction.followUp("⚠️ I can’t kick that user (insufficient perms).")
          : message.reply("⚠️ I can’t kick that user (insufficient perms).");

      await target.kick("Manual inactive cleanup");

      const text = `✅ ${user.tag} has been kicked.`;
      return interaction
        ? interaction.followUp({ content: text })
        : message.reply(text);
    }

    // 💬 Fallback help for prefix
    if (!interaction && !["check", "remove", "kick"].includes(sub)) {
      return message.reply(
        "Usage: `!inactive check [days]` | `!inactive remove [days]` | `!inactive kick @user`"
      );
    }
  },
};

// 🧩 Helper function
async function findInactiveMembers(guild, days, now) {
  const members = await guild.members.fetch();
  const threshold = now - days * 24 * 60 * 60 * 1000;
  return members
    .filter(m => !m.user.bot)
    .filter(m => m.joinedTimestamp < threshold && !m.voice.channel)
    .map(m => m);
}
