const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
  name: "template",
  description: "Get or create a template of this server!",
  aliases: ["template"],
  
  data: new SlashCommandBuilder()
    .setName("template")
    .setDescription("Get or create a template for this server.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute({ interaction, message, isPrefix }) {
    // Determine the guild
    const guild = interaction ? interaction.guild : message.guild;

    if (!guild.features.includes("COMMUNITY")) {
      const text = "⚠️ Server templates are only supported in community-type servers or servers with sufficient setup.";
      if (interaction) return interaction.reply({ content: text, ephemeral: true });
      return message.reply(text);
    }

    // Check permissions
    const member = interaction ? interaction.member : message.member;
    if (!member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      const text = "❌ You need 'Manage Server' permission to use this command.";
      if (interaction) return interaction.reply({ content: text, ephemeral: true });
      return message.reply(text);
    }

    try {
      // Try to fetch existing templates
      const templates = await guild.fetchTemplates();

      let embed;
      if (templates.size > 0) {
        // Use existing template
        const template = templates.first();
        embed = new EmbedBuilder()
          .setTitle("⚫ Template")
          .setDescription(`Here’s your existing server template:
${template.url}`)
          .addFields(
            { name: "Name", value: template.name || "Unnamed Template", inline: true },
            { name: "Creator", value: template.creator?.tag || "Unknown", inline: true },
            { name: "Uses", value: template.usageCount.toString(), inline: true },
          )
          .setColor("Aqua");
      } else {
        // Create a new template if none exist
        const newTemplate = await guild.createTemplate("Server Template", "Auto-generated template via bot");
        embed = new EmbedBuilder()
          .setTitle("✅ New Template Created")
          .setDescription(`Template created successfully!
${newTemplate.url}`)
          .setColor("Green");
      }

      if (interaction) {
        await interaction.reply({ embeds: [embed], ephemeral: false });
      } else {
        await message.reply({ embeds: [embed] });
      }
    } catch (error) {
      console.error("Template generation failed:", error);
      const text = "❌ Could not create or fetch the server template. Make sure the bot has `Manage Guild` permission and the feature is enabled.";
      if (interaction) return interaction.reply({ content: text, ephemeral: true });
      return message.reply(text);
    }
  },
};
