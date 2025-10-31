const {
  SlashCommandBuilder,
  AttachmentBuilder,
  EmbedBuilder,
  ChannelType,
  PermissionFlagsBits,
} = require("discord.js");
const { createTranscript } = require("discord-html-transcripts");
const fs = require("fs");
const path = require("path");
const https = require("https");
const FormData = require("form-data");

module.exports = {
  name: "transcriptchat",
  description: "📜 Generate an HTML transcript of this channel (works for large servers)",
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

  async execute({ client, message, interaction, args, isPrefix }) {
    const channel =
      (interaction && interaction.options.getChannel("channel")) ||
      (isPrefix && message.mentions.channels.first()) ||
      (isPrefix && args.length
        ? message.guild.channels.cache.get(args[0].replace(/[<#>]/g, ""))
        : null) ||
      (interaction ? interaction.channel : message.channel);

    const user = message ? message.author : interaction.user;

    if (!channel || channel.type !== ChannelType.GuildText) {
      const msg = "⚠️ Please provide a valid text channel.";
      if (interaction)
        return interaction.reply({ content: msg, ephemeral: true }).catch(() => {});
      else return message.reply(msg).catch(() => {});
    }

    // 🕐 Notify start
    const statusMsg = await (interaction
      ? interaction.reply({
          content: "🕐 Generating transcript... please wait.",
          ephemeral: true,
          fetchReply: true,
        })
      : message.reply("🕐 Generating transcript... please wait."));

    try {
      // 🗂️ Directory setup
      const baseDir = path.join(__dirname, "..", "transcripts");
      if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir);
      const fileName = `${channel.name}-${Date.now()}.html`;
      const filePath = path.join(baseDir, fileName);

      // 📜 Create transcript (with images)
      const transcript = await createTranscript(channel, {
        limit: -1,
        returnBuffer: true,
        fileName,
        poweredBy: false,
        saveImages: true,
      });

      // Save locally first
      fs.writeFileSync(filePath, transcript.attachment);

      // Check file size
      const fileSizeMB = fs.statSync(filePath).size / (1024 * 1024);

      const embed = new EmbedBuilder()
        .setColor("Aqua")
        .setTitle("📜 Transcript Generated")
        .setDescription(`🗂️ Transcript for ${channel}\n👤 Requested by: ${user}`)
        .setTimestamp();

      if (fileSizeMB > 24.5) {
        // 🚀 Upload to bashupload if too large for Discord
        embed.addFields({
          name: "⚠️ File too large for Discord",
          value: "Uploading to external host (bashupload.com)...",
        });
        if (interaction)
          await interaction.followUp({ embeds: [embed] }).catch(() => {});
        else await message.channel.send({ embeds: [embed] }).catch(() => {});

        const uploadUrl = await uploadToBashUpload(filePath);

        embed.addFields({
          name: "✅ Download Link",
          value: `[Click to download your transcript](${uploadUrl})`,
        });

        if (interaction)
          await interaction.followUp({ embeds: [embed] }).catch(() => {});
        else await message.channel.send({ embeds: [embed] }).catch(() => {});
      } else {
        // 🧾 Send directly if small enough
        const attachment = new AttachmentBuilder(filePath, { name: fileName });
        if (interaction)
          await interaction.followUp({ embeds: [embed], files: [attachment] }).catch(() => {});
        else await message.channel.send({ embeds: [embed], files: [attachment] }).catch(() => {});
      }

      // 🧹 Cleanup after sending
      setTimeout(() => {
        fs.unlinkSync(filePath);
      }, 30000);

      await statusMsg.delete().catch(() => {});
    } catch (err) {
      console.error("❌ TranscriptChat Error:", err);
      const failMsg = "⚠️ Failed to generate transcript. Please try again later.";
      if (interaction)
        await interaction.followUp({ content: failMsg, ephemeral: true }).catch(() => {});
      else await message.reply(failMsg).catch(() => {});
    }
  },
};

// ✅ helper: upload to bashupload.com
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
          // Extract download URL from HTML response
          const match = data.match(/https:\/\/bashupload\.com\/[a-zA-Z0-9_-]+/);
          resolve(match ? match[0] : "Upload failed. Try again later.");
        });
      }
    );

    req.on("error", reject);
    form.pipe(req);
  });
}
