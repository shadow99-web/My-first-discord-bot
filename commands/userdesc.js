const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

module.exports = {
  name: "userdesc",
  description: "Fetch a user's Discord description (bio)",
  data: new SlashCommandBuilder()
    .setName("userdesc")
    .setDescription("Fetch a user's Discord description (bio)")
    .addUserOption(option =>
      option
        .setName("user")
        .setDescription("Select the user")
        .setRequired(false)
    ),

  async execute(context) {
    const isSlash = !!context.interaction;
    const target = isSlash
      ? context.interaction.options.getUser("user") || context.interaction.user
      : context.message.mentions.users.first() || context.message.author;

    if (isSlash) await context.interaction.deferReply();

    try {
      // Fetch via Discord REST API for accurate bio
      const res = await fetch(`https://discord.com/api/v10/users/${target.id}/profile`, {
        headers: {
          Authorization: `Bot ${process.env.TOKEN}`,
          "Content-Type": "application/json"
        }
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const bio =
        data?.user?.bio ||
        data?.bio ||
        data?.user_profile?.bio ||
        "❌ This user has no public description.";

      const embed = new EmbedBuilder()
        .setAuthor({
          name: `${target.tag}`,
          iconURL: target.displayAvatarURL({ dynamic: true })
        })
        .setDescription(`**🪶 Bio:**\n${bio}`)
        .setColor(0x5865f2)
        .setFooter({ text: `User ID: ${target.id}` });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("copy_bio")
          .setLabel("📋 Copy Bio")
          .setStyle(ButtonStyle.Primary)
      );

      const sent = isSlash
        ? await context.interaction.editReply({ embeds: [embed], components: [row] })
        : await context.message.reply({ embeds: [embed], components: [row] });

      // Collector for "Copy Bio" button
      const collector = sent.createMessageComponentCollector({ time: 60000 });
      collector.on("collect", async i => {
        const authorId = isSlash
          ? context.interaction.user.id
          : context.message.author.id;

        if (i.user.id !== authorId)
          return i.reply({
            content: "❌ Only you can copy this bio.",
            ephemeral: true
          });

        await i.reply({ content: `\`\`\`\n${bio}\n\`\`\``, ephemeral: true });
      });
    } catch (err) {
      console.error("⚠️ Error fetching user bio:", err);
      const msg = "⚠️ Unable to fetch user bio. (Discord API error)";
      if (isSlash)
        return context.interaction.editReply({ content: msg });
      else return context.message.reply(msg);
    }
  }
};
