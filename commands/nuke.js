const {
  SlashCommandBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
  PermissionsBitField,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("nuke")
    .setDescription("💥 Delete and recreate this channel (Developer Only)"),

  name: "nuke",
  description: "💥 Delete and recreate this channel (Developer Only)",

  async execute(ctx, client) {
    const isSlash =
      typeof ctx.isChatInputCommand === "function" && ctx.isChatInputCommand();
    const user = isSlash ? ctx.user : ctx.author;
    const channel = isSlash ? ctx.channel : ctx.channel;
    const guild = channel?.guild;

    const devIds = ["1378954077462986772"]; // Your ID(s)

    const reply = async (options) => {
      if (isSlash)
        return ctx.reply({ ...options, flags: options.ephemeral ? 64 : undefined });
      else return ctx.channel.send(options);
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

    // Create confirmation buttons
    const confirm = new ButtonBuilder()
      .setCustomId("confirm_nuke")
      .setLabel("Confirm 💥")
      .setStyle(ButtonStyle.Danger);

    const cancel = new ButtonBuilder()
      .setCustomId("cancel_nuke")
      .setLabel("Cancel ❌")
      .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder().addComponents(confirm, cancel);

    const embed = new EmbedBuilder()
      .setTitle("⚠️ Confirm Nuke")
      .setDescription(
        `Are you **sure** you want to nuke this channel?\n\nThis will delete and recreate **#${channel.name}**.\n\n💣 Proceed with caution!`
      )
      .setColor("Yellow");

    const confirmationMsg = await reply({ embeds: [embed], components: [row] });

    // Create button collector
    const filter = (i) => i.user.id === user.id;
    const collector = confirmationMsg.createMessageComponentCollector({
      filter,
      time: 30000, // 30s timeout
    });

    collector.on("collect", async (interaction) => {
      if (interaction.customId === "confirm_nuke") {
        await interaction.update({
          content: "💣 Nuking channel...",
          embeds: [],
          components: [],
        });

        try {
          const position = channel.position;
          const newChannel = await channel.clone({
            position,
            reason: `💥 Nuked by ${user.tag}`,
          });
          await channel.delete();

          const nukeEmbed = new EmbedBuilder()
            .setTitle("💣 Channel Nuked!")
            .setDescription(`Channel recreated by <@${user.id}>`)
            .setImage("https://media.tenor.com/8vN6VbB3FSgAAAAC/explosion-nuke.gif")
            .setColor("Red")
            .setTimestamp();

          await newChannel.send({ embeds: [nukeEmbed] });

          try {
            const dmEmbed = new EmbedBuilder()
              .setTitle("✅ Channel Nuked Successfully")
              .setDescription(
                `💥 **#${newChannel.name}** in **${guild.name}** has been nuked.\n\n[Jump to Channel](https://discord.com/channels/${guild.id}/${newChannel.id})`
              )
              .setColor("Green");
            await user.send({ embeds: [dmEmbed] });
          } catch {
            console.warn(`⚠️ Could not DM ${user.tag}`);
          }
        } catch (err) {
          console.error("Nuke Error:", err);
          return reply({
            content: `❌ Failed: **${err.message}**`,
            ephemeral: true,
          });
        }
      } else if (interaction.customId === "cancel_nuke") {
        await interaction.update({
          content: "❌ Nuke cancelled.",
          embeds: [],
          components: [],
        });
        collector.stop("cancelled");
      }
    });

    collector.on("end", async (collected, reason) => {
      if (reason === "time") {
        try {
          await confirmationMsg.edit({
            content: "⌛ Nuke confirmation timed out.",
            components: [],
            embeds: [],
          });
        } catch {}
      }
    });
  },
};
