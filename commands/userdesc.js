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

    let user;
    try {
      user = await context.client.users.fetch(target.id, { force: true });
    } catch (err) {
      console.error("Error fetching user bio:", err);
      const failMsg = `⚠️ Cannot fetch bio for **${target.tag}**. The user might have privacy settings or the bot lacks access.`;
      if (isSlash) return context.interaction.editReply({ content: failMsg });
      return context.message.reply(failMsg);
    }

    const bio = user.bio || user.description || null;

    if (!bio) {
      const msg = `❌ No description found for **${user.tag}**.`;
      if (isSlash) return context.interaction.editReply({ content: msg });
      return context.message.reply(msg);
    }

    // Split bio into chunks of 1000 chars max
    const chunks = bio.match(/[\s\S]{1,1000}/g) || [bio];
    let page = 0;

    const makeEmbed = () => new EmbedBuilder()
      .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL({ dynamic: true }) })
      .setDescription(chunks[page])
      .setColor(0x5865F2)
      .setFooter({ text: `Page ${page + 1}/${chunks.length} | User ID: ${user.id}` });

    const makeRow = () => new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("prev")
        .setLabel("⬅️")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(page === 0),
      new ButtonBuilder()
        .setCustomId("next")
        .setLabel("➡️")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(page === chunks.length - 1),
      new ButtonBuilder()
        .setCustomId("copy")
        .setLabel("📋 Copy Bio")
        .setStyle(ButtonStyle.Secondary)
    );

    const sent = isSlash
      ? await context.interaction.editReply({ embeds: [makeEmbed()], components: [makeRow()] })
      : await context.message.reply({ embeds: [makeEmbed()], components: [makeRow()] });

    const collector = sent.createMessageComponentCollector({ time: 120000 }); // 2 minutes

    collector.on("collect", async i => {
      const authorId = isSlash ? context.interaction.user.id : context.message.author.id;
      if (i.user.id !== authorId)
        return i.reply({ content: "❌ Only the command invoker can control this.", ephemeral: false });

      if (i.customId === "next" && page < chunks.length - 1) page++;
      if (i.customId === "prev" && page > 0) page--;

      if (i.customId === "copy") {
        await i.reply({ content: `\`\`\`\n${bio}\n\`\`\``, ephemeral: false });
        return;
      }

      await i.update({ embeds: [makeEmbed()], components: [makeRow()] });
    });

    collector.on("end", () => {
      sent.edit({ components: [] }).catch(() => {});
    });
  }
};
