const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("template")
    .setDescription("Generate a Discord server template link for this server."),

  name: "template",
  description: "Generate a Discord server template link for this server.",

  async execute(ctx, client) {
    const isSlash =
      typeof ctx.isChatInputCommand === "function" && ctx.isChatInputCommand();
    const user = isSlash ? ctx.user : ctx.author;
    const guild = isSlash ? ctx.guild : ctx.guild;

    const reply = async (options) => {
      if (isSlash) {
        return ctx.reply({ ...options, flags: options.ephemeral ? 64 : undefined });
      } else {
        return ctx.channel.send(options);
      }
    };

    try {
      // Check permissions
      if (!guild.members.me.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
        return reply({
          content: "❌ I need **Manage Server** permission to create a template.",
          ephemeral: true,
        });
      }

      // Create server template
      const template = await guild.templates.create(
        `Template by ${user.username}`,
        "Server template generated using the bot"
      );

      const embed = new EmbedBuilder()
        .setTitle("📄 Server Template Created!")
        .setDescription(
          `✅ Template created successfully!\n\n**Server:** ${guild.name}\n**Creator:** ${user}\n\n[Click here to use the template](${template.url})`
        )
        .setThumbnail(guild.iconURL({ dynamic: true }))
        .setColor("Green")
        .setFooter({ text: "Server Template • Public Command" })
        .setTimestamp();

      await reply({ embeds: [embed] });
    } catch (err) {
      console.error("Template Command Error:", err);

      if (String(err).includes("Missing Access"))
        return reply({
          content: "❌ I don't have access to create a template here.",
          ephemeral: true,
        });

      if (String(err).includes("Missing Permissions"))
        return reply({
          content: "❌ I need **Manage Server** permission to do that.",
          ephemeral: true,
        });

      return reply({
        content: `❌ Failed to create template: **${err.message}**`,
        ephemeral: true,
      });
    }
  },
};
