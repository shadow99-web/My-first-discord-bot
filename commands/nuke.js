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
    const client = ctx.client;
    const isPrefix = !!ctx.message;
    const interaction = ctx.interaction;
    const message = ctx.message;

    const channel = isPrefix ? message.channel : interaction.channel;
    const guild = channel?.guild;
    const user = isPrefix ? message.author : interaction.user;

    const devIds = ["1378954077462986772"]; // your developer ID

    // unified reply function
    const reply = async (options) => {
      if (isPrefix) return channel.send(options);
      return interaction.reply({
        ...options,
        flags: options.ephemeral ? 64 : undefined,
      });
    };

    // ---- Validations ----
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

    // ---- Confirmation Buttons ----
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

    // Get the actual sent message (for collectors)
    const msgForCollector = isPrefix ? confirmMsg : await interaction.fetchReply();

    const filter = (i) => i.user.id === user.id;
    const collector = msgForCollector.createMessageComponentCollector({
      filter,
      time: 15000,
    });

    collector.on("collect", async (btnInt) => {
      await btnInt.deferUpdate().catch(() => {});

      if (btnInt.customId === "cancel_nuke") {
        collector.stop("cancelled");
        return msgForCollector.edit({
          content: "❌ Nuke cancelled.",
          components: [],
        });
      }

      if (btnInt.customId === "confirm_nuke") {
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
          return msgForCollector.edit({
            content: `❌ Failed to nuke channel: ${error.message}`,
            components: [],
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
