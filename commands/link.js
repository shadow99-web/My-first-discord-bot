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
          o.setName("name").setDescription("Custom name").setRequired(true))
        .addStringOption(o =>
          o.setName("invite").setDescription("Real Discord invite").setRequired(true)))
    .addSubcommand(cmd =>
      cmd
        .setName("delete")
        .setDescription("Delete a custom link")
        .addStringOption(o =>
          o.setName("name").setDescription("Name to delete").setRequired(true)))
    .addSubcommand(cmd =>
      cmd
        .setName("list")
        .setDescription("List all custom links")),

  async execute(interaction, args = [], prefixMode = false) {
    try {
      if (!interaction?.guild || !interaction?.user) return;

      await interaction.deferReply({ ephemeral: true }); // <--- prevents timeout

      const guildId = interaction.guild.id;
      const userId = interaction.user.id;

      let sub, name, invite;
      if (prefixMode) {
        sub = args[0];
        name = args[1];
        invite = args[2];
      } else {
        sub = interaction.options.getSubcommand();
        name = interaction.options.getString("name");
        invite = interaction.options.getString("invite");
      }

      // ===== CREATE LINK =====
      if (sub === "create") {
        if (!name || !invite)
          return interaction.editReply("❌ Provide both name and invite link.");

        // ✅ Validate invite URL
        const inviteRegex = /^(https?:\/\/)?(www\.)?(discord\.gg|discord\.com\/invite)\/[A-Za-z0-9]+$/;
        if (!inviteRegex.test(invite))
          return interaction.editReply("❌ Invalid Discord invite link.");

        const existing = await Link.findOne({ guildId, name });
        if (existing)
          return interaction.editReply(`❌ The name **${name}** is already taken.`);

        // ✅ Auto-generate redirect link
        const redirectBase = "https://yourdomain.com/invite";
        const redirectLink = `${redirectBase}/${encodeURIComponent(name)}`;

        await Link.create({ guildId, name, invite, redirect: redirectLink, createdBy: userId });

        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setTitle("✅ Custom Link Created")
              .setColor("Green")
              .setDescription(
                `**Name:** ${name}\n**Invite:** [Join Server](${invite})\n**Redirect:** [${redirectLink}](${redirectLink})`
              )
          ]
        });
      }

      // ===== DELETE LINK =====
      if (sub === "delete") {
        const deleted = await Link.findOneAndDelete({ guildId, name });
        if (!deleted) return interaction.editReply("❌ Link not found.");

        return interaction.editReply(`🗑️ Deleted link **${name}**`);
      }

      // ===== LIST LINKS =====
      if (sub === "list") {
        const links = await Link.find({ guildId });
        if (!links.length) return interaction.editReply("✨ No links found for this server.");

        const desc = links
          .map(l => `🔹 **${l.name}** → [Invite](${l.invite}) | [Redirect](${l.redirect || "N/A"})`)
          .join("\n");

        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setTitle("🔗 Custom Links")
              .setDescription(desc)
              .setColor("Aqua")
          ]
        });
      }

      // ===== INVALID SUBCOMMAND =====
      return interaction.editReply("❌ Invalid subcommand.");
    } catch (err) {
      console.error("❌ Error in /link command:", err);
      if (interaction.deferred || interaction.replied)
        return interaction.editReply("⚠️ Something went wrong while processing your command.");
      else
        return interaction.reply({ content: "⚠️ Something went wrong.", ephemeral: true });
    }
  },
};
