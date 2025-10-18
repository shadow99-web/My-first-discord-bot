const { EmbedBuilder } = require("discord.js");
const Link = require("../models/Link");

module.exports = {
  data: {
    name: "link",
    description: "Manage custom invite links",
    type: 1, // Slash command
    options: [
      {
        type: 1,
        name: "create",
        description: "Create a custom invite link",
        options: [
          {
            type: 3,
            name: "name",
            description: "Custom name",
            required: true,
          },
          {
            type: 3,
            name: "invite",
            description: "Real Discord invite",
            required: true,
          },
        ],
      },
      {
        type: 1,
        name: "delete",
        description: "Delete a custom link",
        options: [
          {
            type: 3,
            name: "name",
            description: "Name to delete",
            required: true,
          },
        ],
      },
      {
        type: 1,
        name: "list",
        description: "List all custom links",
      },
    ],
  },

  async execute({ client, interaction, safeReply }) {
    try {
      await interaction.deferReply({ ephemeral: true });

      const guildId = interaction.guild.id;
      const userId = interaction.user.id;

      const sub = interaction.options.getSubcommand();
      const name = interaction.options.getString("name");
      const invite = interaction.options.getString("invite");

      // --- CREATE ---
      if (sub === "create") {
        if (!name || !invite)
          return safeReply({ content: "❌ Provide both name and invite link.", ephemeral: true });

        const inviteRegex = /^(https?:\/\/)?(www\.)?(discord\.gg|discord\.com\/invite)\/[A-Za-z0-9]+$/;
        if (!inviteRegex.test(invite))
          return safeReply({ content: "❌ Invalid Discord invite link.", ephemeral: true });

        const existing = await Link.findOne({ guildId, name });
        if (existing)
          return safeReply({ content: `❌ The name **${name}** is already taken.`, ephemeral: true });

        const redirectBase = "https://yourdomain.com/invite";
        const redirectLink = `${redirectBase}/${encodeURIComponent(name)}`;

        await Link.create({ guildId, name, invite, redirect: redirectLink, createdBy: userId });

        return safeReply({
          embeds: [
            new EmbedBuilder()
              .setTitle("✅ Custom Link Created")
              .setColor("Green")
              .setDescription(
                `**Name:** ${name}\n**Invite:** [Join Server](${invite})\n**Redirect:** [${redirectLink}](${redirectLink})`
              ),
          ],
        });
      }

      // --- DELETE ---
      if (sub === "delete") {
        const deleted = await Link.findOneAndDelete({ guildId, name });
        if (!deleted)
          return safeReply({ content: "❌ Link not found.", ephemeral: true });

        return safeReply({ content: `🗑️ Deleted link **${name}**`, ephemeral: true });
      }

      // --- LIST ---
      if (sub === "list") {
        const links = await Link.find({ guildId });
        if (!links.length)
          return safeReply({ content: "✨ No links found for this server.", ephemeral: true });

        const desc = links
          .map(l => `🔹 **${l.name}** → [Invite](${l.invite}) | [Redirect](${l.redirect || "N/A"})`)
          .join("\n");

        return safeReply({
          embeds: [
            new EmbedBuilder()
              .setTitle("🔗 Custom Links")
              .setDescription(desc)
              .setColor("Aqua"),
          ],
          ephemeral: true,
        });
      }
    } catch (err) {
      console.error("❌ Error in /link command:", err);
      await safeReply({ content: "⚠️ Something went wrong while processing your command.", ephemeral: true });
    }
  },
};
