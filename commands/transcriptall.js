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
const https = require("https");
const FormData = require("form-data");

module.exports = {
  name: "transcriptall",
  description: "📜 Generate transcripts for all text channels (zipped, auto-upload if too big)",
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

    // 🕐 Notify start
    const statusMsg = await (message
      ? message.reply("🕐 Generating transcripts for all text channels... please wait.")
      : interaction.reply({
          content: "🕐 Generating transcripts for all text channels... please wait.",
          ephemeral: true,
          fetchReply: true,
        }));

    try {
      const baseDir = path.join(__dirname, "..", "transcripts");
      if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir);

      const guildDir = path.join(baseDir, `${guild.id}`);
      if (!fs.existsSync(guildDir)) fs.mkdirSync(guildDir);

      const textChannels = guild.channels.cache.filter(
        (ch) => ch.type === ChannelType.GuildText
      );

      let count = 0;

      for (const [id, channel] of textChannels) {
        try {
          const safeName = channel.name.replace(/[^a-z0-9_-]/gi, "_");
          const filePath = path.join(guildDir, `${safeName}.html`);

          const transcript = await createTranscript(channel, {
            limit: 1000,
            returnBuffer: true,
            fileName: `${safeName}.html`,
            poweredBy: false,
            saveImages: true,
          });

          fs.writeFileSync(filePath, transcript.attachment);
          console.log(`✅ Created transcript for #${channel.name}`);
          count++;
        } catch (err) {
          console.warn(`⚠️ Failed to transcript #${channel.name}:`, err.message);
        }
      }

      if (count === 0) {
        const msg = "⚠️ No valid transcripts could be created!";
        if (interaction) return interaction.followUp({ content: msg, ephemeral: true });
        else return message.reply(msg);
      }

      // ✅ Zip all transcripts
      const zipPath = path.join(baseDir, `${guild.name.replace(/[^a-z0-9_-]/gi, "_")}-transcripts.zip`);
      const output = fs.createWriteStream(zipPath);
      const archive = archiver("zip", { zlib: { level: 9 } });

      archive.pipe(output);
      archive.directory(guildDir, false);
      await archive.finalize();
      await new Promise((resolve) => output.on("close", resolve));

      const zipSize = fs.statSync(zipPath).size / (1024 * 1024);

      const embed = new EmbedBuilder()
        .setColor("Aqua")
        .setTitle("📦 Server Transcripts Generated")
        .setDescription(`🗂️ **${count} transcript(s)** generated for ${guild.name}\n👤 Requested by: ${user}`)
        .setTimestamp();

      // ✅ Handle big file upload
      if (zipSize > 25) {
        embed.addFields({
          name: "⚠️ File too large for Discord",
          value: "Uploading to external host (transfer.sh)...",
        });

        if (interaction) await interaction.followUp({ embeds: [embed] });
        else await message.channel.send({ embeds: [embed] });

        const uploadUrl = await uploadToTransfer(zipPath);

        embed.addFields({
          name: "✅ Download Link",
          value: `[Click to download](${uploadUrl})`,
        });

        if (interaction)
          await interaction.followUp({ embeds: [embed] });
        else
          await message.channel.send({ embeds: [embed] });
      } else {
        const attachment = new AttachmentBuilder(zipPath, {
          name: `${guild.name}-transcripts.zip`,
        });

        if (interaction)
          await interaction.followUp({ embeds: [embed], files: [attachment] });
        else
          await message.channel.send({ embeds: [embed], files: [attachment] });
      }

      await statusMsg.delete().catch(() => {});

      // 🧹 Cleanup
      setTimeout(() => {
        fs.rmSync(guildDir, { recursive: true, force: true });
        fs.unlinkSync(zipPath);
      }, 20000);
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

// ✅ helper: upload to 0x0.st (Render-safe)
async function uploadToTransfer(filePath) {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append("file", fs.createReadStream(filePath));

    const req = https.request(
      {
        method: "POST",
        host: "0x0.st",
        path: "/",
        headers: form.getHeaders(),
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve(data.trim())); // returns direct link like https://0x0.st/abcd.zip
      }
    );

    req.on("error", (err) => {
      console.error("Upload error:", err);
      reject(err);
    });

    form.pipe(req);
  });
}
