const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  EmbedBuilder,
} = require("discord.js");
const { createTranscript } = require("discord-html-transcripts");
const { uploadTranscript } = require("../utils/transcriptUploader");

module.exports = {
  name: "transcriptall",
  description: "📜 Generate transcripts for all text channels",
  data: new SlashCommandBuilder()
    .setName("transcriptall")
    .setDescription("📜 Generate transcripts for all text channels")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute({ interaction, message }) {
    const isInteraction = !!interaction;
    const guild = isInteraction ? interaction.guild : message.guild;

    if (!guild)
      return (isInteraction
        ? interaction.reply("⚠️ Use this inside a server.")
        : message.reply("⚠️ Use this inside a server."));

    if (isInteraction)
      await interaction.reply({
        content: "🕐 Generating transcripts for all text channels...",
        ephemeral: true,
      });
    else await message.reply("🕐 Generating transcripts for all text channels...");

    const results = [];
    for (const [, channel] of guild.channels.cache.filter(
      (c) => c.type === ChannelType.GuildText
    )) {
      try {
        const buffer = await createTranscript(channel, {
          limit: 1000,
          returnBuffer: true,
          fileName: `${channel.name}.html`,
        });

        const { success, fileUrl, error } = await uploadTranscript({
          buffer,
          filename: `${channel.name}.html`,
        });

        results.push({
          name: channel.name,
          success,
          url: fileUrl,
          error,
        });
      } catch (err) {
        results.push({ name: channel.name, success: false, error: err.message });
      }
    }

    const lines = results
      .map((r) =>
        r.success
          ? `✅ ${r.name} → [View](${r.url})`
          : `❌ ${r.name} → ${r.error}`
      )
      .join("\n");

    const embed = new EmbedBuilder()
      .setTitle("📜 TranscriptAll Results")
      .setDescription(lines)
      .setColor("Blue")
      .setTimestamp();

    if (isInteraction) await interaction.followUp({ embeds: [embed] });
    else await message.channel.send({ embeds: [embed] });

    // Auto delete after 30 mins
    setTimeout(async () => {
      for (const r of results)
        if (r.url)
          try {
            await fetch(r.url, { method: "DELETE" });
          } catch {}
    }, 30 * 60 * 1000);
  },
};
