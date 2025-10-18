const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const Link = require("../models/Link");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("link")
    .setDescription("Manage custom invite links")
    .addSubcommand(cmd =>
      cmd
        .setName("create")
        .setDescription("Create a custom invite link")
        .addStringOption(o =>
          o.setName("name")
            .setDescription("Custom name for your link")
            .setRequired(true))
        .addStringOption(o =>
          o.setName("invite")
            .setDescription("Real Discord invite link (e.g. https://discord.gg/abc123)")
            .setRequired(true)))
    .addSubcommand(cmd =>
      cmd
        .setName("delete")
        .setDescription("Delete a custom link by name")
        .addStringOption(o =>
          o.setName("name")
            .setDescription("Name of the link to delete")
            .setRequired(true)))
    .addSubcommand(cmd =>
      cmd
        .setName("list")
        .setDescription("List all custom links created in this server")),

  /**
   * @param {Object} context
   * @param {import("discord.js").Client} context.client
   * @param {import("discord.js").ChatInputCommandInteraction} context.interaction
   * @param {Function} context.safeReply
   */
  async execute({ client, interaction, safeReply }) {
    try {
      // Prevent Discord timeout
      await interaction.deferReply({ ephemeral: true });

      const guildId = interaction.guild.id;
      const userId = interaction.user.id;
      const sub = interaction.options.getSubcommand();
      const name = interaction.options.getString("name");
      const invite = interaction.options.getString("invite");

      // --- CREATE ---
      if (sub === "create") {
        if (!name || !invite)
          return safeReply({ content: "❌ Please provide both a name and an invite link.", ephemeral: true });

        const inviteRegex = /^(https?:\/\/)?(www\.)?(discord\.gg|discord\.com\/invite)\/[A-Za-z0-9-_]+$/;
        if (!inviteRegex.test(invite))
          return safeReply({ content: "❌ Invalid Discord invite link format.", ephemeral: true });

        const existing = await Link.findOne({ guildId, name });
        if (existing)
          return safeReply({ content: `❌ The name **${name}** is already taken.`, ephemeral: true });

        const redirectBase = "https://yourdomain.com/invite"; // 🔧 Replace with your actual domain
        const redirectLink = `${redirectBase}/${encodeURIComponent(name)}`;

        await Link.create({
          guildId,
          name,
          invite,
          redirect: redirectLink,
          createdBy: userId,
          createdAt: new Date(),
        });

        return safeReply({
          embeds: [
            new EmbedBuilder()
              .setTitle("✅ Custom Link Created")
              .setColor("Green")
              .setDescription(
                `**Name:** ${name}\n**Invite:** [Join Server](${invite})\n**Redirect:** [${redirectLink}](${redirectLink})`
              )
              .setFooter({ text: `Created by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() }),
          ],
          ephemeral: true,
        });
      }

      // --- DELETE ---
      if (sub === "delete") {
        const deleted = await Link.findOneAndDelete({ guildId, name });
        if (!deleted)
          return safeReply({ content: "❌ No link found with that name.", ephemeral: true });

        return safeReply({ content: `❤‍🩹 Successfully deleted link **${name}**.`, ephemeral: true });
      }

      // --- LIST ---
      if (sub === "list") {
        const links = await Link.find({ guildId });
        if (!links.length)
          return safeReply({ content: "✨ No links found for this server yet.", ephemeral: true });

        const desc = links
          .map(l => `🔹 **${l.name}** → [Invite](${l.invite}) | [Redirect](${l.redirect || "N/A"})`)
          .join("\n");

        return safeReply({
          embeds: [
            new EmbedBuilder()
              .setTitle("🔗 Custom Links")
              .setColor("Aqua")
              .setDescription(desc)
              .setFooter({ text: `Total Links: ${links.length}` }),
          ],
          ephemeral: true,
        });
      }

      // Fallback (shouldn’t happen)
      return safeReply({ content: "❌ Invalid subcommand.", ephemeral: true });
    } catch (err) {
      console.error("❌ Error in /link command:", err);
      await safeReply({ content: "⚠️ Something went wrong while processing this command.", ephemeral: true });
    }
  },
};
