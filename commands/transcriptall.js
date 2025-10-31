const {
  SlashCommandBuilder,
  EmbedBuilder,
  ChannelType,
  PermissionFlagsBits,
} = require("discord.js");
const { createTranscript } = require("discord-html-transcripts");
const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

// upload helper
async function uploadToBashupload(filePath) {
  const fileStream = fs.createReadStream(filePath);
  const response = await axios.post("https://bashupload.com/", fileStream, {
    headers: { "Content-Type": "application/octet-stream" },
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
  });
  const match = response.data.match(/https?:\/\/bashupload\.com\/\S+/);
  return match ? match[0] : null;
}

module.exports = {
  name: "transcriptall",
  description: "📜 Generate HTML transcripts for all text channels in this server.",
  usage: "transcriptall",
  data: new SlashCommandBuilder()
    .setName("transcriptall")
    .setDescription("📜 Generate HTML transcripts for all text channels in this server.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute({ client, interaction, message, args, isPrefix }) {
    const guild = interaction ? interaction.guild : message.guild;
    const user = message ? message.author : interaction.user;

    if (!guild) {
      const msg = "⚠️ Command must be used inside a server.";
      if (interaction)
        return interaction.reply({ content: msg, ephemeral: true }).catch(() => {});
      else return message.reply(msg).catch(() => {});
    }

    if (interaction)
      await interaction.deferReply({ ephemeral: false }).catch(() => {});
    else await message.reply("🕐 Generating transcripts for all channels... Please wait.");

    const tempDir = path.join(__dirname, "transcripts_temp_all");
    await fs.ensureDir(tempDir);

    const textChannels = guild.channels.cache.filter(
      (ch) => ch.type === ChannelType.GuildText && ch.viewable
    );

    const fetchLimit = 100;
    const chunkSize = 1000;
    const maxMessages = 10000;
    const results = [];

    try {
      for (const [id, channel] of textChannels) {
        let beforeId = null;
        let collectedMessages = [];
        let chunkIndex = 1;

        while (collectedMessages.length < maxMessages) {
          const fetched = await channel.messages.fetch({
            limit: fetchLimit,
            ...(beforeId && { before: beforeId }),
          });
          if (fetched.size === 0) break;

          const messages = Array.from(fetched.values());
          collectedMessages.push(...messages);
          beforeId = messages[messages.length - 1].id;

          if (collectedMessages.length >= chunkSize) {
            const filePath = path.join(
              tempDir,
              `${channel.name}-part-${chunkIndex}.html`
            );
            const transcript = await createTranscript(channel, {
              limit: collectedMessages.length,
              fileName: path.basename(filePath),
              saveImages: true,
              returnBuffer: false,
              poweredBy: false,
            });

            const url = await uploadToBashupload(transcript.attachment);
            if (url) results.push(`📄 ${channel} — [Part ${chunkIndex}](${url})`);

            await fs.remove(transcript.attachment);
            chunkIndex++;
            collectedMessages = [];
          }
        }

        // leftover
        if (collectedMessages.length > 0) {
          const filePath = path.join(tempDir, `${channel.name}-part-${chunkIndex}.html`);
          const transcript = await createTranscript(channel, {
            limit: collectedMessages.length,
            fileName: path.basename(filePath),
            saveImages: true,
            returnBuffer: false,
            poweredBy: false,
          });

          const url = await uploadToBashupload(transcript.attachment);
          if (url) results.push(`📄 ${channel} — [Part ${chunkIndex}](${url})`);
          await fs.remove(transcript.attachment);
        }
      }

      if (results.length === 0) {
        const msg = "⚠️ No valid transcripts could be created.";
        if (interaction)
          return interaction.editReply({ content: msg }).catch(() => {});
        else return message.reply(msg).catch(() => {});
      }

      const embed = new EmbedBuilder()
        .setColor("Aqua")
        .setTitle("📜 All Channel Transcripts Generated")
        .setDescription(
          `🗂️ **${results.length} transcript parts** generated for ${textChannels.size} channel(s)\n\n${results.join(
            "\n"
          )}\n\nRequested by: ${user}`
        )
        .setTimestamp();

      if (interaction)
        await interaction.editReply({ embeds: [embed] }).catch(() => {});
      else await message.channel.send({ embeds: [embed] }).catch(() => {});

      await fs.remove(tempDir);
    } catch (err) {
      console.error("❌ TranscriptAll error:", err);
      const failText = "⚠️ Failed to generate transcripts. Please try again later.";
      if (interaction)
        await interaction.editReply({ content: failText }).catch(() => {});
      else await message.reply(failText).catch(() => {});
    }
  },
};
