// commands/template.js
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  name: "template",
  aliases: ["createtemplate", "savemod", "srvtemplate"],
  data: new SlashCommandBuilder()
    .setName("template")
    .setDescription("Create a server template (requires Manage Guild)")
    .addStringOption(opt =>
      opt.setName("name")
         .setDescription("Template name (optional)")
         .setRequired(false)
    )
    .addStringOption(opt =>
      opt.setName("description")
         .setDescription("Template description (optional)")
         .setRequired(false)
    ),

  /**
   * Unified execute signature used across your project:
   * execute({ client, interaction, message, args, isPrefix })
   */
  async execute({ client, interaction, message, args, isPrefix }) {
    // determine context
    const guild = isPrefix ? message.guild : interaction.guild;
    const user = isPrefix ? message.author : interaction.user;

    // simple permission rule: allow guild owner or members with ManageGuild.
    const member = await guild.members.fetch(user.id).catch(() => null);
    const userHasPerm = member && (member.permissions.has("ManageGuild") || guild.ownerId === user.id);

    if (!userHasPerm) {
      const reply = "🚫 You need to be the server owner or have the **Manage Server** permission to create a template.";
      return isPrefix ? message.reply(reply) : interaction.reply({ content: reply, ephemeral: true });
    }

    // Bot permission check
    const me = guild.members.me;
    if (!me.permissions.has("ManageGuild")) {
      const reply = "❌ I need the **Manage Server** permission to create templates. Please grant it and try again.";
      return isPrefix ? message.reply(reply) : interaction.reply({ content: reply, ephemeral: true });
    }

    // Gather name/description from slash or prefix args
    let name, description;
    if (isPrefix) {
      // prefix usage examples:
      // !template "My Template" "My description here"
      // or !template MyTemplate My description...
      if (args.length === 0) {
        name = `${guild.name} template`;
        description = `Template created by ${user.tag}`;
      } else {
        // try to support quoted name
        const raw = args.join(" ");
        const quoted = raw.match(/^"([^"]+)"(?:\s+"([^"]+)")?/);
        if (quoted) {
          name = quoted[1];
          description = quoted[2] || `Template created by ${user.tag}`;
        } else {
          // fallback: first token = name, rest = description
          name = args[0];
          description = args.slice(1).join(" ") || `Template created by ${user.tag}`;
        }
      }
    } else {
      name = interaction.options.getString("name") || `${guild.name} template`;
      description = interaction.options.getString("description") || `Template created by ${user.tag}`;
    }

    try {
      // Create the template
      const template = await guild.templates.create({
        name,
        description,
      });

      const url = `https://discord.new/${template.code}`;

      const embed = new EmbedBuilder()
        .setTitle("✅ Server Template Created")
        .setDescription(`Template **${template.name}** created successfully.`)
        .addFields(
          { name: "Template URL", value: url },
          { name: "Server", value: guild.name, inline: true },
          { name: "By", value: `${user.tag}`, inline: true }
        )
        .setFooter({ text: `Template ID: ${template.id}` })
        .setTimestamp();

      if (isPrefix) {
        await message.reply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed] });
      }
    } catch (err) {
      console.error("template command error:", err);
      const errMsg = "❌ Failed to create template. Ensure I have Manage Server permission and templates are allowed on this server.";
      if (isPrefix) message.reply(errMsg).catch(() => {});
      else interaction.reply({ content: errMsg, ephemeral: true }).catch(() => {});
    }
  }
};
