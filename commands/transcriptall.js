const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  ChannelType,
} = require("discord.js");
const fs = require("fs-extra");
const path = require("path");
const archiver = require("archiver");
const { createTranscript } = require("discord-html-transcripts");
const FormData = require("form-data");
const https = require("https");

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
          const match = data.match(/https?:\/\/bashupload\.com\/[a-zA-Z0-9_-]+/);
          if (match) resolve(match[0]);
          else reject(new Error("Upload failed: No link returned"));
        });
      }
    );

    req.on("error", reject);
    form.pipe(req);
  });
}

module.exports = {
  name: "transcriptall",
  description: "📚 Generate HTML transcripts for all text channels.",
  data: new SlashCommandBuilder()
    .setName("transcriptall")
    .setDescription("📚 Generate transcripts for all text channels in this server.")
    .addBooleanOption((opt) =>
      opt
        .setName("includeimages")
        .setDescription("Include images in transcripts? (default: false)")
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute({ interaction }) {
    await interaction.deferReply({ ephemeral: false });
    const includeImages = interaction.options.getBoolean("includeimages") || false;
    const guild = interaction.guild;

    const baseDir = path.join(__dirname, `transcripts_${guild.id}_${Date.now()}`);
    await fs.ensureDir(baseDir);

    const textChannels = guild.channels.cache.filter(
      (ch) => ch.type === ChannelType.GuildText
    );
    const total = textChannels.size;
    let completed = 0;

    const embed = new EmbedBuilder()
      .setColor("Aqua")
      .setTitle("📚 Transcript Generation Started")
      .setDescription(
        `Generating transcripts for **${total}** channels...\nInclude Images: **${includeImages ? "Yes" : "No"}**`
      )
      .setFooter({ text: "Progress will update automatically." });

    await interaction.editReply({ embeds: [embed] });

    for (const channel of textChannels.values()) {
      completed++;
      embed.setDescription(
        `Generating transcripts for **${total}** channels...\n\n📄 Processing: **#${channel.name}** (${completed}/${total})`
      );
      await interaction.editReply({ embeds: [embed] }).catch(() => {});

      try {
        await createTranscript(channel, {
          limit: -1,
          returnBuffer: false,
          fileName: `${channel.name}.html`,
          poweredBy: false,
          saveImages: includeImages,
        }).then(() => console.log(`✅ ${channel.name}`));
      } catch (err) {
        console.log(`❌ ${channel.name}: ${err.message}`);
      }
    }

    const zipPath = `${baseDir}.zip`;
    const output = fs.createWriteStream(zipPath);
    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.pipe(output);
    archive.directory(baseDir, false);
    await archive.finalize();

    const stats = fs.statSync(zipPath);
    const fileSize = stats.size / (1024 * 1024); // MB
    const finalEmbed = new EmbedBuilder()
      .setColor("Green")
      .setTitle("✅ Transcripts Completed")
      .setDescription(
        `All **${total}** channel transcripts created.\nInclude Images: **${includeImages ? "Yes" : "No"}**`
      )
      .setTimestamp();

    if (fileSize <= 25) {
      await interaction.editReply({ embeds: [finalEmbed], files: [zipPath] });
    } else {
      finalEmbed.addFields({
        name: "⚠️ File too large for Discord",
        value: "Uploading to bashupload.com...",
      });
      await interaction.editReply({ embeds: [finalEmbed] });

      const uploadUrl = await uploadToBashUpload(zipPath);
      finalEmbed.addFields({
        name: "✅ Download Link",
        value: `[Click to download](${uploadUrl})`,
      });

      await interaction.editReply({ embeds: [finalEmbed] });
      fs.removeSync(baseDir);
      fs.unlinkSync(zipPath);
    }
  },
};
