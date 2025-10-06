// commands/userdesc.js
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("userdesc")
    .setDescription("Fetch a user's Discord description (bio)")
    .addUserOption(option =>
      option
        .setName("user")
        .setDescription("Select the user to fetch bio for")
        .setRequired(false)
    ),

  async execute(context) {
    const isSlash = !context.isPrefix;
    const target =
      isSlash
        ? context.interaction.options.getUser("user") || context.interaction.user
        : context.message.mentions.users.first() || context.message.author;

    if (isSlash) await context.interaction.deferReply();

    try {
      // Fetch fresh user data from Discord API (includes bio/description)
      const user = await context.client.users.fetch(target.id, { force: true });

      const desc = user.bio || user.description || null;

      if (!desc) {
        const msg = `❌ No description found for **${user.tag}**.`;
        if (isSlash)
          return context.interaction.editReply({ content: msg });
        return context.message.reply(msg);
      }

      // Create the embed
      const embed = new EmbedBuilder()
        .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL({ dynamic: true }) })
        .setDescription(`**🪶 Displayable:**\n${desc}`)
        .addFields({
          name: "➕ TAKE BIO",
          value: `\n${desc}\n\`
        })
        .setColor(0x5865F2)
        .setFooter({ text: `User ID: ${user.id}` });

      const sent = isSlash
        ? await context.interaction.editReply({ embeds: [embed] })
        : await context.message.reply({ embeds: [embed] });

      return sent;

    } catch (err) {
      console.error("Error fetching user description:", err);
      const failMsg = "⚠️ Unable to fetch user description. Possibly missing permissions or rate limit.";
      if (isSlash)
        return context.interaction.editReply({ content: failMsg });
      return context.message.reply(failMsg);
    }
  },
};
