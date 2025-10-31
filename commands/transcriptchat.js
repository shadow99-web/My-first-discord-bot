const {
  SlashCommandBuilder,
  EmbedBuilder,
  ChannelType,
  PermissionFlagsBits,
} = require("discord.js");
const fs = require("fs");
const path = require("path");
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
  name: "transcriptchat",
  description: "📜 Generate an HTML transcript of this channel (small or large servers)",
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
    .addBooleanOption((opt) =>
      opt
        .setName("includeimages")
        .setDescription("Include images in transcript? (default: false)")
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute({ client, interaction }) {
    const channel =
      interaction.options.getChannel("channel") || interaction.channel;
    const includeImages = interaction.options.getBoolean("includeimages") || false;

    if (channel.type !== ChannelType.GuildText) {
      return interaction.reply({
        content: "⚠️ Please select a valid text channel.",
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: false });

    try {
      const filePath = path.join(
        __dirname,
        `${channel.name}-${Date.now()}.html`
      );

      const transcript = await createTranscript(channel, {
        limit: -1,
        returnBuffer: false,
        fileName: path.basename(filePath),
        poweredBy: false,
        saveImages: includeImages,
      });

      const stats = fs.statSync(transcript);
      const fileSize = stats.size / (1024 * 1024); // MB

      const embed = new EmbedBuilder()
        .setColor("Aqua")
        .setTitle("📜 Transcript Generated")
        .setDescription(
          `Channel: ${channel}\nRequested by: ${interaction.user}\nInclude Images: **${includeImages ? "Yes" : "No"}**`
        )
        .setTimestamp();

      if (fileSize <= 25) {
        await interaction.editReply({
          embeds: [embed],
          files: [transcript],
        });
      } else {
        embed.addFields({
          name: "⚠️ File too large for Discord",
          value: "Uploading to bashupload.com...",
        });
        await interaction.editReply({ embeds: [embed] });

        const uploadUrl = await uploadToBashUpload(transcript);
        embed.addFields({
          name: "✅ Download Link",
          value: `[Click to download](${uploadUrl})`,
        });

        await interaction.editReply({ embeds: [embed] });
        fs.unlinkSync(transcript);
      }
    } catch (err) {
      console.error("❌ Transcript error:", err);
      await interaction.editReply({
        content: "⚠️ Failed to generate transcript. Please try again later.",
      });
    }
  },
};
