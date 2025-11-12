const {
  SlashCommandBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
  ComponentType,
  PermissionFlagsBits,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("inactive")
    .setDescription("Find and remove inactive members from the server safely.")
    .addIntegerOption((option) =>
      option
        .setName("days")
        .setDescription("Inactive for how many days?")
        .setMinValue(1)
        .setMaxValue(365)
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

  async execute(interaction) {
    const guild = interaction.guild;
    const member = guild?.members?.cache?.get(interaction.user.id);
    const days = interaction.options.getInteger("days");

    if (!guild)
      return interaction.reply({
        content: "❌ This command can only be used inside a server.",
        flags: 64,
      });

    if (!member || !member.permissions.has(PermissionFlagsBits.KickMembers))
      return interaction.reply({
        content: "⚠️ You don’t have permission to use this command.",
        flags: 64,
      });

    await interaction.deferReply({ flags: 64 });

    const now = Date.now();
    const cutoff = now - days * 24 * 60 * 60 * 1000;

    await guild.members.fetch();
    const inactiveMembers = guild.members.cache.filter((m) => {
      if (m.user.bot) return false;
      const joined = m.joinedTimestamp;
      const lastMsg = m.lastMessage?.createdTimestamp;
      return (lastMsg || joined) < cutoff;
    });

    if (inactiveMembers.size === 0)
      return interaction.editReply("✅ No inactive members found.");

    const membersArray = Array.from(inactiveMembers.values());
    let page = 0;
    const pageSize = 20;
    const totalPages = Math.ceil(membersArray.length / pageSize);

    const generateEmbed = () => {
      const start = page * pageSize;
      const current = membersArray.slice(start, start + pageSize);

      const desc = current
        .map((m, i) => `\`${start + i + 1}.\` ${m.user.tag}`)
        .join("\n");

      return new EmbedBuilder()
        .setTitle(`📋 Inactive Members (Page ${page + 1}/${totalPages})`)
        .setDescription(
          desc.length > 0 ? desc : "No more inactive members to show."
        )
        .setColor("Yellow")
        .setFooter({
          text: `Inactive for ${days} days • ${inactiveMembers.size} total`,
        });
    };

    // Buttons
    const prevBtn = new ButtonBuilder()
      .setCustomId("prev")
      .setLabel("◀️")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page === 0);

    const nextBtn = new ButtonBuilder()
      .setCustomId("next")
      .setLabel("▶️")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page === totalPages - 1);

    const confirmBtn = new ButtonBuilder()
      .setCustomId("confirm")
      .setLabel("✅ Confirm")
      .setStyle(ButtonStyle.Success);

    const cancelBtn = new ButtonBuilder()
      .setCustomId("cancel")
      .setLabel("❌ Cancel")
      .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder().addComponents(
      prevBtn,
      nextBtn,
      confirmBtn,
      cancelBtn
    );

    const msg = await interaction.editReply({
      embeds: [generateEmbed()],
      components: [row],
    });

    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 60_000,
      filter: (i) => i.user.id === interaction.user.id,
    });

    collector.on("collect", async (i) => {
      if (i.customId === "prev") {
        page = Math.max(0, page - 1);
      } else if (i.customId === "next") {
        page = Math.min(totalPages - 1, page + 1);
      } else if (i.customId === "cancel") {
        await i.update({
          content: "❌ Operation canceled.",
          embeds: [],
          components: [],
        });
        collector.stop("cancelled");
        return;
      } else if (i.customId === "confirm") {
        await i.update({
          content: `⏳ Removing ${inactiveMembers.size} inactive members...`,
          embeds: [],
          components: [],
        });

        let success = 0;
        for (const [id, m] of inactiveMembers) {
          try {
            await m.kick(`Inactive for ${days} days`);
            success++;
          } catch (err) {
            console.error(`Failed to kick ${m.user.tag}:`, err);
          }
        }

        await interaction.followUp({
          content: `✅ Successfully removed ${success}/${inactiveMembers.size} inactive members.`,
          flags: 64,
        });

        collector.stop("confirmed");
        return;
      }

      const newRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("prev")
          .setLabel("◀️")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page === 0),
        new ButtonBuilder()
          .setCustomId("next")
          .setLabel("▶️")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page === totalPages - 1),
        confirmBtn,
        cancelBtn
      );

      await i.update({ embeds: [generateEmbed()], components: [newRow] });
    });

    collector.on("end", async (_, reason) => {
      if (reason === "time") {
        await interaction.editReply({
          content: "⌛ Confirmation timed out. No members were removed.",
          embeds: [],
          components: [],
        });
      }
    });
  },
};
