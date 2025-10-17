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
    if (!interaction?.guild || !interaction?.user) return;

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
        return interaction.reply({ content: "❌ Provide both name and invite link.", ephemeral: true });

      // ===== Invite URL validation =====
      const inviteRegex = /^(https?:\/\/)?(www\.)?(discord\.gg|discord\.com\/invite)\/[A-Za-z0-9]+$/;
      if (!inviteRegex.test(invite))
        return interaction.reply({ content: "❌ Invalid Discord invite link.", ephemeral: true });

      const existing = await Link.findOne({ guildId, name });
      if (existing)
        return interaction.reply({ content: `❌ The name **${name}** is already taken.`, ephemeral: true });

      await Link.create({ guildId, name, invite, createdBy: userId });

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("✅ Custom Link Created")
            .setColor("Green")
            .setDescription(
              `Name: **${name}**\nInvite: [Join Server](${invite})\nRedirect: **https://yourdomain.com/invite/${name}**`
            )
        ]
      });
    }

    // ===== DELETE LINK =====
    if (sub === "delete") {
      const deleted = await Link.findOneAndDelete({ guildId, name });
      if (!deleted) return interaction.reply({ content: "❌ Link not found.", ephemeral: true });

      return interaction.reply({ content: `🗑️ Deleted link **${name}**`, ephemeral: true });
    }

    // ===== LIST LINKS =====
    if (sub === "list") {
      const links = await Link.find({ guildId });
      if (!links.length) return interaction.reply({ content: "✨ No links found for this server.", ephemeral: true });

      const desc = links.map(l => `🔹 **${l.name}** → [Invite](${l.invite})`).join("\n");

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("🔗 Custom Links")
            .setDescription(desc)
            .setColor("Aqua")
        ]
      });
    }

    // ===== INVALID SUBCOMMAND =====
    return interaction.reply({ content: "❌ Invalid subcommand.", ephemeral: true });
  },
};
