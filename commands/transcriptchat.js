const {
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder,
} = require("discord.js");
const { createTranscript } = require("discord-html-transcripts");
const { uploadTranscript } = require("../utils/transcriptUploader");

module.exports = {
  name: "transcriptchat",
  description: "📜 Generate an HTML transcript of this channel",
  usage: "transcriptchat [#channel]",
  data: new SlashCommandBuilder()
    .setName("transcriptchat")
    .setDescription("📜 Generate an HTML transcript of this channel")
    .addChannelOption((opt) =>
      opt
        .setName("channel")
        .setDescription("Select a text channel")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute({ interaction, message, isPrefix }) {
    const isInteraction = !!interaction;
    const channel =
      (isInteraction
        ? interaction.options.getChannel("channel")
        : message.mentions.channels.first()) ||
      (isInteraction ? interaction.channel : message.channel);

    if (!channel || channel.type !== ChannelType.GuildText) {
      const msg = "⚠️ Please select a valid text channel.";
      if (isInteraction)
        return interaction.reply({ content: msg, ephemeral: true });
      else return message.reply(msg);
    }

    // Defer for slash
    if (isInteraction)
      await interaction.reply({
        content: "🕐 Generating transcript, please wait...",
        ephemeral: true,
      });
    else await message.reply("🕐 Generating transcript, please wait...");

    try {
      const transcriptBuffer = await createTranscript(channel, {
        limit: 1000,
        returnBuffer: true,
        fileName: `${channel.name}.html`,
        saveImages: true,
      });

      const { success, fileUrl, error } = await uploadTranscript({
        buffer: transcriptBuffer,
        filename: `${channel.name}.html`,
      });

      if (!success) throw new Error(error);

      const embed = new EmbedBuilder()
        .setTitle("📜 Transcript Created")
        .setDescription(
          `Transcript for ${channel} generated successfully.\n[📂 View Transcript](${fileUrl})`
        )
        .setColor("Green")
        .setTimestamp();

      if (isInteraction)
        await interaction.followUp({ embeds: [embed] });
      else await message.channel.send({ embeds: [embed] });

      // Auto delete after 30 mins
      setTimeout(async () => {
        try {
          await fetch(`${fileUrl}`, { method: "DELETE" });
        } catch {}
      }, 30 * 60 * 1000);
    } catch (err) {
      const failMsg = `❌ Failed to generate transcript: ${err.message}`;
      if (isInteraction)
        await interaction.followUp({ content: failMsg, ephemeral: true });
      else await message.reply(failMsg);
    }
  },
};
