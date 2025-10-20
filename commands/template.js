const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  name: "template",
  description: "📄 Create a public server template for this server.",
  aliases: ["servertemplate", "maketemplate"],

  data: new SlashCommandBuilder()
    .setName("template")
    .setDescription("📄 Create a public server template for this server.")
    .addStringOption(opt =>
      opt.setName("name")
        .setDescription("Enter the template name")
        .setRequired(true))
    .addStringOption(opt =>
      opt.setName("description")
        .setDescription("Enter a short description")
        .setRequired(false)),

  async execute(interactionOrMessage, client) {
    const isSlash = !!interactionOrMessage.isChatInputCommand;
    const interaction = isSlash ? interactionOrMessage : null;
    const message = isSlash ? null : interactionOrMessage;
    const guild = isSlash ? interaction.guild : message.guild;

    if (!guild) {
      const reply = "❌ This command can only be used inside a server.";
      return isSlash ? interaction.reply({ content: reply, flags: 64 }) : message.reply(reply);
    }

    try {
      const name = isSlash
        ? interaction.options.getString("name")
        : message.content.split(" ").slice(1).join(" ") || `Template-${Date.now()}`;

      const desc = isSlash
        ? (interaction.options.getString("description") || "No description provided.")
        : "No description provided.";

      const template = await guild.templates.create(name, desc);

      const embed = new EmbedBuilder()
        .setTitle("✅ Server Template Created!")
        .setDescription(`Here’s your template link:\n[**Use Template**](${template.url})`)
        .addFields(
          { name: "⭐ Template Name", value: name, inline: true },
          { name: "✨ Description", value: desc, inline: true },
        )
        .setColor("Green")
        .setTimestamp()
        .setFooter({
          text: `${isSlash ? interaction.user.username : message.author.username}`,
          iconURL: `${isSlash ? interaction.user.displayAvatarURL() : message.author.displayAvatarURL()}`
        });

      if (isSlash) await interaction.reply({ embeds: [embed] });
      else await message.reply({ embeds: [embed] });

    } catch (err) {
      console.error("Template Command Error:", err);
      const reply = "❌ I couldn’t create a template. I may not have `Manage Server` permission.";
      return isSlash
        ? interaction.reply({ content: reply, flags: 64 })
        : message.reply(reply);
    }
  },
};
