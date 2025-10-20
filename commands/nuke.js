const {
  SlashCommandBuilder,
  PermissionsBitField,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("nuke")
    .setDescription("Deletes and recreates the current channel (Developer only)"),

  name: "nuke",
  description: "Deletes and recreates the current channel (Developer only)",

  async execute(interactionOrMessage, client) {
    const isSlash =
      typeof interactionOrMessage.isChatInputCommand === "function" &&
      interactionOrMessage.isChatInputCommand();

    const user = isSlash ? interactionOrMessage.user : interactionOrMessage.author;
    const channel = interactionOrMessage.channel;
    const guild = channel.guild;

    const devIds = ["1378954077462986772"]; // ✅ Add your ID(s)

    // 🧱 Permission Check
    if (!devIds.includes(user.id)) {
      const replyText = "⛔ Only **developers** can use this command.";
      return isSlash
        ? interactionOrMessage.reply({ content: replyText, flags: 64 })
        : channel.send(replyText);
    }

    if (!guild.members.me.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
      const replyText = "❌ I need **Manage Channels** permission.";
      return isSlash
        ? interactionOrMessage.reply({ content: replyText, flags: 64 })
        : channel.send(replyText);
    }

    // ⚠️ Confirmation Embed + Buttons
    const confirmEmbed = new EmbedBuilder()
      .setTitle("☢️ Confirm Channel Nuke")
      .setDescription(
        "This will **delete and recreate** the current channel.\n\n⚠️ All messages will be permanently lost.\n\nAre you sure you want to proceed?"
      )
      .setColor("Red");

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("confirm_nuke")
        .setLabel("Yes, Nuke 💥")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId("cancel_nuke")
        .setLabel("Cancel ❌")
        .setStyle(ButtonStyle.Secondary)
    );

    const sent = isSlash
      ? await interactionOrMessage.reply({
          embeds: [confirmEmbed],
          components: [row],
          flags: 64,
          fetchReply: true,
        })
      : await channel.send({ embeds: [confirmEmbed], components: [row] });

    // 🧠 Button Collector
    const collector = sent.createMessageComponentCollector({ time: 20_000 });

    collector.on("collect", async (btn) => {
      if (btn.user.id !== user.id) {
        return btn.reply({ content: "⛔ This isn’t your confirmation.", ephemeral: true });
      }

      if (btn.customId === "cancel_nuke") {
        await btn.update({
          content: "❎ Nuke cancelled.",
          embeds: [],
          components: [],
        });
        return collector.stop();
      }

      if (btn.customId === "confirm_nuke") {
        await btn.update({
          content: "💣 Nuking channel...",
          embeds: [],
          components: [],
        });

        try {
          const newChannel = await channel.clone();
          await channel.delete();

          const embed = new EmbedBuilder()
            .setTitle("💥 Channel Nuked!")
            .setDescription(`Channel recreated by <@${user.id}>`)
            .setColor("Red")
            .setImage("https://media.tenor.com/8vN6VbB3FSgAAAAC/explosion-nuke.gif");

          await newChannel.send({ embeds: [embed] });
        } catch (err) {
          console.error("Nuke Error:", err);
          await btn.followUp({
            content: `❌ Failed to nuke: ${err.message}`,
            ephemeral: true,
          });
        }

        collector.stop();
      }
    });

    collector.on("end", async () => {
      if (!sent.editable) return;
      try {
        await sent.edit({ components: [] });
      } catch {}
    });
  },
};
