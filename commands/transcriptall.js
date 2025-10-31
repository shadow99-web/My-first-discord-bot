const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  AttachmentBuilder,
  ChannelType,
} = require("discord.js");
const { createTranscript } = require("discord-html-transcripts");
const fs = require("fs");
const path = require("path");
const https = require("https");
const FormData = require("form-data");

module.exports = {
  name: "transcriptall",
  description: "📁 Generate transcripts for all text channels (HTML format, large-server safe)",
  usage: "transcriptall",
  data: new SlashCommandBuilder()
    .setName("transcriptall")
    .setDescription("📁 Generate transcripts for all text channels in this server")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute({ client, message, interaction }) {
    const user = message ? message.author : interaction.user;
    const guild = message ? message.guild : interaction.guild;

    const statusMsg = await (interaction
      ? interaction.reply({
          content: "🕐 Generating transcripts for all text channels... this may take a while!",
          ephemeral: true,
          fetchReply: true,
        })
      : message.reply("🕐 Generating transcripts for all text channels... please wait."));

    try {
      // Create directory for temporary files
      const baseDir = path.join(__dirname, "..", "transcripts_all");
      if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir);

      const allChannels = guild.channels.cache.filter(
        (ch) => ch.type === ChannelType.GuildText
      );

      if (allChannels.size === 0) {
        const msg = "⚠️ No text channels found in this server.";
        if (interaction)
          return interaction.followUp({ content: msg, ephemeral: true });
        else return message.reply(msg);
      }

      const summaryEmbed = new EmbedBuilder()
        .setColor("Aqua")
        .setTitle("📁 Server Transcript Summary")
        .setDescription(`🗂️ Server: **${guild.name}**\n👤 Requested by: ${user}`)
        .setTimestamp();

      // Store URLs to send later
      const transcriptLinks = [];

      for (const [id, channel] of allChannels) {
        try {
          const fileName = `${channel.name}-${Date.now()}.html`;
          const filePath = path.join(baseDir, fileName);

          const transcript = await createTranscript(channel, {
            limit: -1,
            returnBuffer: true,
            fileName,
            poweredBy: false,
            saveImages: true,
          });

          fs.writeFileSync(filePath, transcript.attachment);
          const fileSizeMB = fs.statSync(filePath).size / (1024 * 1024);

          if (fileSizeMB > 24.5) {
            const url = await uploadToBashUpload(filePath);
            transcriptLinks.push(`📜 **${channel.name}** → [View / Download](${url})`);
          } else {
            // Upload directly if small
            const attachment = new AttachmentBuilder(filePath, { name: fileName });
            const sent = await (interaction
              ? interaction.followUp({
                  content: `📜 Transcript for **${channel.name}**`,
                  files: [attachment],
                })
              : message.channel.send({
                  content: `📜 Transcript for **${channel.name}**`,
                  files: [attachment],
                }));
            transcriptLinks.push(`📜 **${channel.name}** → [Sent in Chat](${sent.url || "N/A"})`);
          }

          // Cleanup local file
          fs.unlinkSync(filePath);
        } catch (err) {
          console.error(`❌ Failed transcript for ${channel.name}:`, err);
          transcriptLinks.push(`⚠️ **${channel.name}** → Failed`);
        }
      }

      // Send summary
      summaryEmbed.addFields({
        name: "📜 Transcripts Generated",
        value: transcriptLinks.join("\n").slice(0, 4000),
      });

      if (interaction)
        await interaction.followUp({ embeds: [summaryEmbed] });
      else await message.channel.send({ embeds: [summaryEmbed] });

      await statusMsg.delete().catch(() => {});
    } catch (err) {
      console.error("❌ TranscriptAll Error:", err);
      const failMsg =
        "⚠️ Failed to generate all transcripts. Please try again later.";
      if (interaction)
        await interaction.followUp({ content: failMsg, ephemeral: true });
      else await message.reply(failMsg);
    }
  },
};

// ✅ helper function: upload to bashupload.com
async function uploadToBashUpload(filePath) {
  return new Promise((resolve, reject) => {
    const fileName = path.basename(filePath);
    const form = new FormData();
    form.append("file", fs.createReadStream(filePath));

    const req = https.request(
      {
        method: "POST",
        host: "bashupload.com",
        path: `/${encodeURIComponent(fileName)}`,
        headers: form.getHeaders(),
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          const match = data.match(/https:\/\/bashupload\.com\/[a-zA-Z0-9_-]+/);
          resolve(match ? match[0] : "Upload failed. Try again later.");
        });
      }
    );

    req.on("error", reject);
    form.pipe(req);
  });
                                }
