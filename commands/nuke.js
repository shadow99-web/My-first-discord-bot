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

  async execute(ctx, client) {
    const isSlash =
      typeof ctx.isChatInputCommand === "function" && ctx.isChatInputCommand();

    const guild = isSlash ? ctx.guild : ctx.guild || ctx.message?.guild;
    const channel = isSlash ? ctx.channel : ctx.channel || ctx.message?.channel;
    const user = isSlash ? ctx.user : ctx.author;

    const devIds = ["1378954077462986772"]; // 👈 your developer IDs here

    const reply = async (options) => {
      try {
        if (isSlash) {
          return await ctx.reply({
            ...options,
            flags: options.ephemeral ? 64 : undefined,
          });
        } else {
          return await channel.send(options);
        }
      } catch (err) {
        console.error("Reply Error:", err);
      }
    };

    // Check context
    if (!guild)
      return reply({
        content: "❌ This command can only be used inside a server.",
        ephemeral: true,
      });

    // Developer restriction
    if (!devIds.includes(user.id))
      return reply({
        content: "❌ Only developers can use this command.",
        ephemeral: true,
      });

    // Permission checks (bot)
    const botMember = guild.members.me;
    if (
      !botMember.permissions.has([
        PermissionsBitField.Flags.ManageChannels,
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.SendMessages,
      ])
    ) {
      return reply({
        content: "❌ I need **Manage Channels**, **View Channel**, and **Send Messages** permissions.",
        ephemeral: true,
      });
    }

    // Permission checks (user)
    const member = guild.members.cache.get(user.id);
    if (!member || !member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
      return reply({
        content: "🚫 You need the **Manage Channels** permission to do this.",
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

    // For slash commands, `reply()` returns void sometimes; fetch if necessary
    const targetMsg = isSlash ? await ctx.fetchReply() : confirmMsg;

    const collector = targetMsg.createMessageComponentCollector({
      time: 15000,
      filter: (i) => i.user.id === user.id,
    });

    collector.on("collect", async (interaction) => {
      try {
        if (interaction.customId === "cancel_nuke") {
          await interaction.update({
            content: "❌ Nuke cancelled.",
            components: [],
          });
          return collector.stop("cancelled");
        }

        if (interaction.customId === "confirm_nuke") {
          await interaction.update({
            content: "💣 Channel nuking in progress...",
            components: [],
          });
          collector.stop("confirmed");

          try {
            const position = channel.position;
            const newChannel = await channel.clone({
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

            await newChannel.send({ embeds: [embed] });
          } catch (error) {
            console.error("Nuke Error:", error);
            await reply({
              content: `❌ Failed to nuke channel: ${error.message}`,
              ephemeral: true,
            });
          }
        }
      } catch (err) {
        console.error("Collector Error:", err);
      }
    });

    collector.on("end", async (_, reason) => {
      if (!["confirmed", "cancelled"].includes(reason)) {
        try {
          await targetMsg.edit({
            content: "⌛ Time expired, nuke cancelled.",
            components: [],
          });
        } catch {}
      }
    });
  },
};
