const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionsBitField,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

module.exports = {
  name: "nuke",
  description: "💥 Delete and recreate this channel (Developer Only)",

  data: new SlashCommandBuilder()
    .setName("nuke")
    .setDescription("💥 Delete and recreate this channel (Developer Only)"),

  async execute(ctx, client) {
    // Determine context type
    const isSlash =
      typeof ctx.isChatInputCommand === "function" && ctx.isChatInputCommand();

    // Normalize variables
    const message = !isSlash ? ctx : null;
    const interaction = isSlash ? ctx : null;
    const channel = isSlash ? interaction.channel : message?.channel;
    const guild = channel?.guild;
    const user = isSlash ? interaction.user : message?.author;

    const devIds = ["1378954077462986772"]; // your developer IDs

    // Universal reply helper
    const reply = async (options) => {
      try {
        if (isSlash) {
          return await interaction.reply({
            ...options,
            flags: options.ephemeral ? 64 : undefined,
          });
        } else {
          if (!channel) throw new Error("No channel context found for prefix command.");
          return await channel.send(options);
        }
      } catch (err) {
        console.error("Reply Error:", err);
      }
    };

    if (!guild) {
      return reply({
        content: "❌ This command can only be used inside a server.",
        ephemeral: true,
      });
    }

    if (!devIds.includes(user.id)) {
      return reply({
        content: "❌ Only developers can use this command.",
        ephemeral: true,
      });
    }

    const botMember = guild.members.me;
    if (
      !botMember.permissionsIn(channel).has([
        PermissionsBitField.Flags.ManageChannels,
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.SendMessages,
      ])
    ) {
      return reply({
        content:
          "❌ I need **Manage Channels**, **View Channel**, and **Send Messages** permissions here.",
        ephemeral: true,
      });
    }

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
      content: "⚠️ Are you sure you want to **nuke** this channel? This cannot be undone!",
      components: [row],
    });

    // Retrieve the reply message for collector support
    let msgForCollector;
    try {
      msgForCollector = isSlash ? await interaction.fetchReply() : confirmMsg;
    } catch {
      msgForCollector = confirmMsg;
    }

    // Create button collector
    const collector = msgForCollector.createMessageComponentCollector({
      time: 15000,
      filter: (i) => i.user.id === user.id,
    });

    collector.on("collect", async (i) => {
      await i.deferUpdate().catch(() => {});

      if (i.customId === "cancel_nuke") {
        await i.editReply({ content: "❌ Nuke cancelled.", components: [] });
        return collector.stop("cancelled");
      }

      if (i.customId === "confirm_nuke") {
        collector.stop("confirmed");
        try {
          const position = channel.position;
          const clonedChannel = await channel.clone({
            position,
            reason: `Nuked by ${user.tag}`,
          });
          await channel.delete("Nuked via bot");

          const embed = new EmbedBuilder()
            .setTitle("💣 Channel Nuked!")
            .setDescription(`💥 Channel recreated by <@${user.id}>`)
            .setImage("https://media.tenor.com/8vN6VbB3FSgAAAAC/explosion-nuke.gif")
            .setColor("Red")
            .setTimestamp();

          await clonedChannel.send({ embeds: [embed] });
        } catch (error) {
          console.error("Nuke Error:", error);
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
