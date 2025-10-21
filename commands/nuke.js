const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionsBitField,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("nuke")
    .setDescription("💥 Delete and recreate this channel (Developer Only)"),

  name: "nuke",
  description: "💥 Delete and recreate this channel (Developer Only)",

  async execute(ctx, client) {
    // Detect if command is slash or prefix
    const isSlash =
      typeof ctx.isChatInputCommand === "function" && ctx.isChatInputCommand();

    const user = isSlash ? ctx.user : ctx.author;
    const channel = isSlash ? ctx.channel : ctx.channel || ctx.message?.channel;
    const guild = channel?.guild;

    const devIds = ["1378954077462986772"]; // your dev IDs here

    // Reply helper — now safe for both slash and prefix
    const reply = async (options) => {
      try {
        if (isSlash) {
          return await ctx.reply({
            ...options,
            flags: options.ephemeral ? 64 : undefined,
          });
        } else {
          if (!channel) return console.warn("⚠️ Prefix command: no channel found!");
          return await channel.send(options);
        }
      } catch (err) {
        console.error("Reply error:", err);
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

    if (!guild.members.me.permissions.has(PermissionsBitField.Flags.ManageChannels))
      return reply({
        content: "❌ I need **Manage Channels** permission to nuke this channel.",
        ephemeral: true,
      });

    // 🔘 Confirmation buttons
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

    const collector = confirmMsg.createMessageComponentCollector({
      time: 15000,
      filter: (i) => i.user.id === user.id,
    });

    collector.on("collect", async (interaction) => {
      await interaction.deferUpdate();

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
            position: position,
            reason: `Nuked by ${user.tag}`,
          });

          await channel.delete();

          const embed = new EmbedBuilder()
            .setTitle("💣 Channel Nuked!")
            .setDescription(`💥 Channel recreated by <@${user.id}>`)
            .setImage("https://media.tenor.com/8vN6VbB3FSgAAAAC/explosion-nuke.gif")
            .setColor("Red")
            .setTimestamp();

          await newChannel.send({ embeds: [embed] });
        } catch (err) {
          console.error("❌ Nuke Error:", err);
          await reply({
            content: `❌ Failed to nuke: **${err.message}**`,
            ephemeral: true,
          });
        }
      }
    });

    collector.on("end", async (_, reason) => {
      if (reason !== "confirmed" && reason !== "cancelled") {
        try {
          await confirmMsg.edit({
            content: "⌛ Time expired, nuke cancelled.",
            components: [],
          });
        } catch {}
      }
    });
  },
};
