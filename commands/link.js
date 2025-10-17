const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");
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
      cmd.setName("list").setDescription("List all custom links")),

  /** Command execution */
  async execute(interaction, args = [], prefixMode = false) {
    // guard against undefined interactions
    if (!interaction?.guild || !interaction?.user) {
      console.error("Interaction missing guild or user data", interaction);
      return;
    }

    const guildId = interaction.guild.id;
    const userId = interaction.user.id;

    // determine command source
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

    if (sub === "create") {
      if (!name || !invite)
        return interaction.reply({
          content: "❌ Provide both name and invite link.",
          flags: MessageFlags.Ephemeral
        });

      const existing = await Link.findOne({ name });
      if (existing)
        return interaction.reply({
          content: `❌ The name **${name}** is already taken.`,
          flags: MessageFlags.Ephemeral
        });

      await Link.create({ guildId, name, invite, createdBy: userId });
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("✅ Custom Link Created")
            .setColor("Green")
            .setDescription(
              `Name: **${name}**
Invite: [Join Server](${invite})
Redirect: **https://yourdomain.com/invite/${name}**`
            )
        ]
      });
    }

    if (sub === "delete") {
      const deleted = await Link.findOneAndDelete({ guildId, name });
      if (!deleted)
        return interaction.reply({
          content: "❌ Link not found.",
          flags: MessageFlags.Ephemeral
        });

      return interaction.reply(`😑 Deleted link **${name}**`);
    }

    if (sub === "list") {
      const links = await Link.find({ guildId });
      if (!links.length)
        return interaction.reply("✨ No links found for this server.");

      const desc = links
        .map(l => `🔹 **${l.name}** → [Invite](${l.invite})`)
        .join("
");

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("🔗 Custom Links")
            .setDescription(desc)
            .setColor("Aqua")
        ]
      });
    }
  },
};
