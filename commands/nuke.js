const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require("discord.js");

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

    // 🔐 Developer IDs
    const devIds = ["1378954077462986772"]; // Replace with your Discord ID(s)

    const reply = async (options) => {
      if (isSlash)
        return ctx.reply({ ...options, flags: options.ephemeral ? 64 : undefined });
      else return ctx.channel.send(options);
    };

    // 🚫 DMs not supported
    if (!guild)
      return reply({
        content: "❌ This command can only be used inside a server.",
        ephemeral: true,
      });

    // 🧑‍💻 Developer-only check
    if (!devIds.includes(user.id))
      return reply({
        content: "❌ Only developers can use this command.",
        ephemeral: true,
      });

    // 🪪 Permission check
    if (!guild.members.me.permissions.has(PermissionsBitField.Flags.ManageChannels))
      return reply({
        content: "❌ I need **Manage Channels** permission to nuke this channel.",
        ephemeral: true,
      });

    try {
      const position = channel.position; // keep channel position
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
      return reply({
        content: `❌ Failed to nuke: **${err.message}**`,
        ephemeral: true,
      });
    }
  },
};
