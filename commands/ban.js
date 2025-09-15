// commands/ban.js
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Ban a member")
    .addStringOption(opt =>
      opt.setName("user")
        .setDescription("User ID, mention or username")
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName("reason")
        .setDescription("Reason for the ban")
        .setRequired(false)
    ),

  // Unified execute signature used across your project
  async execute({ interaction, message, args, client, isPrefix }) {
    const guild = interaction?.guild || message.guild;
    const invoker = interaction?.user || message.author;
    const isSlash = Boolean(interaction);

    // Permission checks for the invoker
    if (isSlash) {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.BanMembers)) {
        return interaction.reply({ content: "❌ You don't have permission to ban members.", ephemeral: true });
      }
    } else {
      if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) {
        return message.reply("❌ You don't have permission to ban members.");
      }
    }

    // Bot permission check
    if (!guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)) {
      const replyText = "❌ I need the `Ban Members` permission to do that.";
      return isSlash ? interaction.reply({ content: replyText, ephemeral: true }) : message.reply(replyText);
    }

    // Get input and reason
    const input = isSlash ? interaction.options.getString("user") : (args && args[0]) || null;
    const reason = isSlash ? (interaction.options.getString("reason") || "No reason provided") : (args && args.slice(1).join(" ")) || "No reason provided";

    if (!input) {
      const replyText = "❌ Please provide a user ID, mention or username.";
      return isSlash ? interaction.reply({ content: replyText, ephemeral: true }) : message.reply(replyText);
    }

    // Helper: resolve member by ID/mention/username search
    async function resolveMember(guild, raw) {
      const cleaned = raw.replace(/[<@!>]/g, "").trim();

      // If it looks like an ID, try fetch by ID
      if (/^\d{16,20}$/.test(cleaned)) {
        try {
          const fetched = await guild.members.fetch(cleaned).catch(() => null);
          if (fetched) return fetched;
        } catch {}
      }

      // Try fetch by query (username/nickname). Requires Guild Members intent (you have that).
      try {
        const results = await guild.members.fetch({ query: raw, limit: 1 }).catch(() => null);
        if (results && results.size > 0) return results.first();
      } catch {}

      // No member found
      return null;
    }

    // Try to resolve a GuildMember
    let targetMember = await resolveMember(guild, input);

    // If member not found but input is ID-like, attempt ban by ID (non-member ban)
    const idCandidate = input.replace(/[<@!>]/g, "").trim();
    const isId = /^\d{16,20}$/.test(idCandidate);

    // Prevent banning yourself or guild owner
    if (targetMember) {
      if (targetMember.id === invoker.id) {
        const replyText = "❌ You cannot ban yourself.";
        return isSlash ? interaction.reply({ content: replyText, ephemeral: true }) : message.reply(replyText);
      }
      if (targetMember.id === guild.ownerId) {
        const replyText = "❌ I cannot ban the server owner.";
        return isSlash ? interaction.reply({ content: replyText, ephemeral: true }) : message.reply(replyText);
      }

      // Check if the bot can ban them (role hierarchy)
      if (!targetMember.bannable) {
        const replyText = "❌ I cannot ban that user (role hierarchy or missing permissions).";
        return isSlash ? interaction.reply({ content: replyText, ephemeral: true }) : message.reply(replyText);
      }

      // Proceed to ban the member
      try {
        await guild.members.ban(targetMember.id, { reason });
      } catch (err) {
        console.error("Ban error:", err);
        const replyText = "❌ Failed to ban the user. Check my permissions and role position.";
        return isSlash ? interaction.reply({ content: replyText, ephemeral: true }) : message.reply(replyText);
      }

      const embed = new EmbedBuilder()
        .setTitle("Member Banned")
        .setColor("Blue")
        .setDescription(`💙 **${targetMember.user.tag}** has been banned.\n**Reason:** ${reason}`)
        .setTimestamp();

      return isSlash ? interaction.reply({ embeds: [embed] }) : message.channel.send({ embeds: [embed] });
    }

    // If no member found but input is an ID, attempt guild.members.ban(id)
    if (!targetMember && isId) {
      try {
        await guild.members.ban(idCandidate, { reason });
      } catch (err) {
        console.error("Ban by ID error:", err);
        const replyText = "❌ Failed to ban that ID. Either it's invalid, already banned, or I lack permission.";
        return isSlash ? interaction.reply({ content: replyText, ephemeral: true }) : message.reply(replyText);
      }

      const embed = new EmbedBuilder()
        .setTitle("User Banned (by ID)")
        .setColor("Blue")
        .setDescription(`💙 User with ID \`${idCandidate}\` has been banned.\n**Reason:** ${reason}`)
        .setTimestamp();

      return isSlash ? interaction.reply({ embeds: [embed] }) : message.channel.send({ embeds: [embed] });
    }

    // Not found at all
    const replyText = "❌ User not found. Try a mention, full username, or ID.";
    return isSlash ? interaction.reply({ content: replyText, ephemeral: true }) : message.reply(replyText);
  }
};
