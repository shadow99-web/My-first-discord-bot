const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionsBitField,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

module.exports = {
  name: "nuke",
  description: "💥 Delete and recreate this channel (Developer Only)",

  data: new SlashCommandBuilder()
    .setName("nuke")
    .setDescription("💥 Delete and recreate this channel (Developer Only)"),

  async execute(ctx) {
    const isSlash =
      typeof ctx.isChatInputCommand === "function" && ctx.isChatInputCommand();

    // Define variables for context
    const channel = isSlash ? ctx.channel : ctx.channel || ctx.message?.channel;
    const guild = channel?.guild;
    const user = isSlash ? ctx.user : ctx.author;
    const devIds = ["1378954077462986772"]; // Developer IDs

    // Reply helper for both command types
    const reply = async (options) => {
      try {
        if (isSlash) {
          return await ctx.reply({
            ...options,
            flags: options.ephemeral ? 64 : undefined,
          });
        } else {
          if (!channel) throw new Error("Channel not found for prefix command");
          return await channel.send(options);
        }
      } catch (error) {
        console.error("Reply error:", error);
      }
    };

    if (!guild)
      return reply({
        content: "❌ This command can only be used inside a server.",
        ephemeral: true,
      });

    if (!devIds.includes(user.id))
      return reply({
        content: "❌ Only developers can use this command.",
        ephemeral: true,
      });

    const botMember = guild.members.me;
    if (
      !botMember.permissionsIn(channel).has([
        PermissionsBitField.Flags.ManageChannels,
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.SendMessages,
      ])
    )
      return reply({
        content:
          "❌ I need **Manage Channels**, **View Channel**, and **Send Messages** permissions here.",
        ephemeral: true,
      });

    const member = await guild.members.fetch(user.id).catch(() => null);
    if (!member || !member.permissions.has(PermissionsBitField.Flags.ManageChannels))
      return reply({
        content: "❌ You need the **Manage Channels** permission to do this.",
        ephemeral: true,
      });

    // Confirmation buttons
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("confirm_nuke")
        .setLabel("Confirm 💣")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId("cancel_nuke")
        .setLabel("Cancel ❌")
        .setStyle(ButtonStyle.Secondary)
    );

    const confirmMsg = await reply({
      content:
        "⚠️ Are you sure you want to **nuke** this channel? This cannot be undone!",
      components: [row],
    });

    const msgForCollector = isSlash
      ? await ctx.fetchReply().catch(() => confirmMsg)
      : confirmMsg;

    const filter = (interaction) => interaction.user.id === user.id;

    const collector = msgForCollector.createMessageComponentCollector({
      filter,
      time: 15000,
    });

    collector.on("collect", async (interaction) => {
      await interaction.deferUpdate().catch(() => {});

      if (interaction.customId === "cancel_nuke") {
        collector.stop("cancelled");
        return interaction.editReply({
          content: "❌ Nuke cancelled.",
          components: [],
        });
      }

      if (interaction.customId === "confirm_nuke") {
        collector.stop("confirmed");

        try {
          const position = channel.position;
          const newChannel = await channel.clone({
            position,
            reason: `Nuked by ${user.tag}`,
          });
          await channel.delete("Nuked by bot command");

          const embed = new EmbedBuilder()
            .setTitle("💣 Channel Nuked!")
            .setDescription(`💥 Channel recreated by <@${user.id}>`)
            .setImage(
              "https://media.tenor.com/8vN6VbB3FSgAAAAC/explosion-nuke.gif"
            )
            .setColor("Red")
            .setTimestamp();

          await newChannel.send({ embeds: [embed] });
        } catch (error) {
          console.error("Failed to nuke channel:", error);
          await reply({
            content: `❌ Failed to nuke channel: ${error.message}`,
            ephemeral: true,
          });
        }
      }
    });

    collector.on("end", async (_, reason) => {
      if (!["confirmed", "cancelled"].includes(reason)) {
        try {
          await msgForCollector.edit({
            content: "⌛ Time expired, nuke cancelled.",
            components: [],
          });
        } catch {}
      }
    });
  },
};
