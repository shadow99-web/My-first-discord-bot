const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("userdesc")
    .setDescription("Fetch a user's Discord description (bio)")
    .addUserOption(option =>
      option.setName("user")
        .setDescription("Select the user")
        .setRequired(false)
    ),

  async execute(context) {
    const isSlash = !context.isPrefix;
    const target = isSlash
      ? context.interaction.options.getUser("user") || context.interaction.user
      : context.message.mentions.users.first() || context.message.author;

    if (isSlash) await context.interaction.deferReply();

    try {
      const user = await context.client.users.fetch(target.id, { force: true });
      const bio = user.bio || user.description || null;

      if (!bio) {
        const msg = `❌ No description found for **${user.tag}**.`;
        if (isSlash) return context.interaction.editReply({ content: msg });
        return context.message.reply(msg);
      }

      const embed = new EmbedBuilder()
        .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL({ dynamic: true }) })
        .setDescription(`**🪶 Bio:**\n${bio}`)
        .setColor(0x5865F2)
        .setFooter({ text: `User ID: ${user.id}` });

      // Optional copy button
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("copy_bio")
          .setLabel("📋 Copy Bio")
          .setStyle(ButtonStyle.Primary)
      );

      const sent = isSlash
        ? await context.interaction.editReply({ embeds: [embed], components: [row] })
        : await context.message.reply({ embeds: [embed], components: [row] });

      // Collector for the button
      const collector = sent.createMessageComponentCollector({ time: 60000 });
      collector.on("collect", async i => {
        const authorId = isSlash ? context.interaction.user.id : context.message.author.id;
        if (i.user.id !== authorId)
          return i.reply({ content: "❌ Only you can copy this bio.", ephemeral: true });

        await i.reply({ content: `\`\`\`\n${bio}\n\`\`\``, ephemeral: true });
      });

    } catch (err) {
      console.error(err);
      const failMsg = "⚠️ Unable to fetch user bio.";
      if (isSlash) return context.interaction.editReply({ content: failMsg });
      return context.message.reply(failMsg);
    }
  }
};
