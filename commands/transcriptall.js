const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  EmbedBuilder,
  AttachmentBuilder,
} = require("discord.js");
const { createTranscript } = require("discord-html-transcripts");
const fs = require("fs");
const path = require("path");
const archiver = require("archiver");

module.exports = {
  name: "transcriptall",
  description: "📜 Generate transcripts for all text channels (zipped)",
  usage: "transcriptall",
  data: new SlashCommandBuilder()
    .setName("transcriptall")
    .setDescription("📜 Generate transcripts for all text channels in this server")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute({ client, message, interaction }) {
    const guild = interaction ? interaction.guild : message.guild;
    const user = interaction ? interaction.user : message.author;

    if (!guild) {
      const msg = "⚠️ This command can only be used inside a server.";
      if (interaction) return interaction.reply({ content: msg, ephemeral: true });
      else return message.reply(msg);
    }

    // Notify start
    const statusMsg = await (message
      ? message.reply("🕐 Generating transcripts for all channels... this may take a while.")
      : interaction.reply({
          content: "🕐 Generating transcripts for all channels... please wait.",
          ephemeral: true,
          fetchReply: true,
        }));

    try {
      const transcriptDir = path.join(__dirname, "..", "transcripts");
      if (!fs.existsSync(transcriptDir)) fs.mkdirSync(transcriptDir);

      const textChannels = guild.channels.cache.filter(
        (ch) => ch.type === ChannelType.GuildText
      );

      let count = 0;
      for (const [id, channel] of textChannels) {
        try {
          const filePath = path.join(transcriptDir, `${channel.name}.html`);

          const transcriptFile = await createTranscript(channel, {
            limit: 1000, // cap for performance, adjust if needed
            returnBuffer: false,
            fileName: `${channel.name}.html`,
            poweredBy: false,
            saveImages: true,
          });

          if (transcriptFile?.attachment?.attachment) {
            const stream = fs.createWriteStream(filePath);
            stream.write(transcriptFile.attachment.attachment);
            stream.end();
          }

          console.log(`✅ Created transcript for #${channel.name}`);
          count++;
        } catch (err) {
          console.warn(`⚠️ Failed to transcript #${channel.name}:`, err.message);
        }
      }

      if (count === 0) {
        return statusMsg.edit("⚠️ No valid transcripts could be created!");
      }

      // Zip everything
      const zipPath = path.join(transcriptDir, `${guild.name}-transcripts.zip`);
      const output = fs.createWriteStream(zipPath);
      const archive = archiver("zip", { zlib: { level: 9 } });

      archive.pipe(output);
      archive.directory(transcriptDir, false);
      await archive.finalize();

      const attachment = new AttachmentBuilder(zipPath, {
        name: `${guild.name}-transcripts.zip`,
      });

      const embed = new EmbedBuilder()
        .setColor("Aqua")
        .setTitle("📦 Server Transcripts Generated")
        .setDescription(
          `🗂️ **${count} transcript(s)** created for ${guild.name}.\n👤 Requested by: ${user}`
        )
        .setTimestamp();

      if (message)
        await message.channel.send({ embeds: [embed], files: [attachment] });
      else
        await interaction.followUp({ embeds: [embed], files: [attachment] });

      await statusMsg.delete().catch(() => {});

      // cleanup old files after send
      setTimeout(() => {
        fs.rmSync(transcriptDir, { recursive: true, force: true });
      }, 15000);
    } catch (err) {
      console.error("❌ TranscriptAll Error:", err);
      const failMsg = "⚠️ Failed to generate all transcripts. Try again later.";
      if (interaction)
        await interaction.followUp({ content: failMsg, ephemeral: true });
      else
        await message.reply(failMsg);
    }
  },
};
