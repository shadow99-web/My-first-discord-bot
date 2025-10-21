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

  async execute({ client, interaction, message, safeReply, isPrefix }) {
    const channel = isPrefix ? message.channel : interaction.channel;
    const guild = channel.guild;
    const user = isPrefix ? message.author : interaction.user;
    const devIds = ["1378954077462986772"]; // Your developers' Discord IDs here

    if (!guild)
      return safeReply({
        content: "❌ This command can only be used inside a server.",
        ephemeral: true,
      });

    if (!devIds.includes(user.id))
      return safeReply({
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
      return safeReply({
        content:
          "❌ I need **Manage Channels**, **View Channel**, and **Send Messages** permissions here.",
        ephemeral: true,
      });

    const member = await guild.members.fetch(user.id).catch(() => null);
    if (!member || !member.permissions.has(PermissionsBitField.Flags.ManageChannels))
      return safeReply({
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

    const confirmMsg = await safeReply({
      content:
        "⚠️ Are you sure you want to **nuke** this channel? This cannot be undone!",
      components: [row],
      ephemeral: isPrefix, // ephemeral only on prefix to avoid clutter
    });

    // Retrieve the message for collector (slash replies may not return the message)
    let msgForCollector;
    if (isPrefix) {
      msgForCollector = confirmMsg;
    } else {
      try {
        msgForCollector = await interaction.fetchReply();
      } catch {
        msgForCollector = confirmMsg;
      }
    }

    const filter = (i) => i.user.id === user.id;

    const collector = msgForCollector.createMessageComponentCollector({
      filter,
      time: 15000,
    });

    collector.on("collect", async (btnInt) => {
      await btnInt.deferUpdate().catch(() => {});

      if (btnInt.customId === "cancel_nuke") {
        collector.stop("cancelled");
        return btnInt.editReply({
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
          await safeReply({
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
