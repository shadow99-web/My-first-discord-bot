const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ChannelType,
} = require("discord.js");
const { createTranscript } = require("discord-html-transcripts");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const FormData = require("form-data");

const CHUNK_SIZE = 500; // messages per HTML part
const FETCH_LIMIT = 100;
const MAX_MESSAGES = 10000;

module.exports = {
  name: "transcriptall",
  description: "📜 Create transcripts of ALL text channels (with uploads)",
  data: new SlashCommandBuilder()
    .setName("transcriptall")
    .setDescription("📜 Generate transcripts for all text channels and upload them")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute({ client, interaction, message, isPrefix }) {
    const isInteraction = !!interaction;
    const guild = isInteraction ? interaction.guild : message.guild;

    if (!guild) {
      const err = "⚠️ This command can only be used in a server.";
      if (isInteraction) return interaction.reply({ content: err, ephemeral: true });
      else return message.reply(err);
    }

    if (isInteraction) await interaction.deferReply({ ephemeral: true }).catch(() => {});
    const status = isInteraction
      ? await interaction.fetchReply()
      : await message.reply("🕐 Starting transcripts for all channels...");

    const tempDir = path.join(__dirname, "..", "transcripts_all_temp");
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    const textChannels = guild.channels.cache.filter(
      (ch) => ch.type === ChannelType.GuildText && ch.viewable
    );

    let summaryLines = [];
    let totalChannels = textChannels.size;
    let currentIndex = 1;

    for (const [id, channel] of textChannels) {
      const progressMsg = `📘 [${currentIndex}/${totalChannels}] Processing #${channel.name}...`;
      if (isInteraction) await interaction.editReply({ content: progressMsg }).catch(() => {});
      else if (status) await status.edit(progressMsg).catch(() => {});

      try {
        let beforeId = null;
        let totalFetched = 0;
        let partIndex = 1;

        while (totalFetched < MAX_MESSAGES) {
          const messagesCollected = [];

          while (messagesCollected.length < CHUNK_SIZE && totalFetched < MAX_MESSAGES) {
            const limit = Math.min(FETCH_LIMIT, CHUNK_SIZE - messagesCollected.length);
            const fetched = await channel.messages.fetch({ limit, ...(beforeId && { before: beforeId }) });
            if (!fetched.size) break;

            const arr = Array.from(fetched.values());
            messagesCollected.push(...arr);
            beforeId = arr[arr.length - 1].id;
            totalFetched += arr.length;
          }

          if (!messagesCollected.length) break;

          const fileName = `${channel.name}-part-${partIndex}.html`;
          const transcript = await createTranscript(channel, {
            limit: messagesCollected.length,
            returnBuffer: true,
            fileName,
            saveImages: true,
            poweredBy: false,
          });

          if (!transcript || !transcript.attachment) break;

          const filePath = path.join(tempDir, fileName);
          fs.writeFileSync(filePath, transcript.attachment);

          // Upload
          let uploadUrl;
          try {
            uploadUrl = await uploadTo0x0(filePath);
          } catch {
            try {
              uploadUrl = await uploadToTransfer(filePath);
            } catch {
              uploadUrl = "FAILED";
            }
          }

          summaryLines.push(`${channel.name} (part ${partIndex}): ${uploadUrl}`);
          fs.unlinkSync(filePath);

          partIndex++;
          if (messagesCollected.length < CHUNK_SIZE) break; // done
        }
      } catch (err) {
        summaryLines.push(`#${channel.name}: ERROR - ${err.message}`);
      }

      currentIndex++;
    }

    const summaryPath = path.join(tempDir, `Server_Transcripts_${guild.name}_${Date.now()}.txt`);
    fs.writeFileSync(summaryPath, summaryLines.join("\n"), "utf8");

    let summaryUrl;
    try {
      summaryUrl = await uploadTo0x0(summaryPath);
    } catch {
      try {
        summaryUrl = await uploadToTransfer(summaryPath);
      } catch {
        summaryUrl = null;
      }
    }

    const embed = new EmbedBuilder()
      .setTitle("📜 Server Transcript Summary")
      .setDescription(
        summaryUrl
          ? `✅ All channel transcripts created.\n[📁 Download Summary File](${summaryUrl})`
          : "✅ Transcripts generated, but failed to upload summary. Check logs."
      )
      .setColor("Green")
      .setTimestamp();

    if (isInteraction) {
      await interaction.editReply({ content: "✅ Done!", embeds: [embed] });
    } else {
      await status.edit("✅ All transcripts done!");
      await message.channel.send({ embeds: [embed] });
    }

    fs.unlinkSync(summaryPath);
  },
};

// --- Upload helpers ---
async function uploadTo0x0(filePath) {
  const form = new FormData();
  form.append("file", fs.createReadStream(filePath));

  const res = await axios.post("https://0x0.st", form, {
    headers: form.getHeaders(),
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
    timeout: 120000,
  });

  if (res.status >= 200 && res.status < 300 && typeof res.data === "string")
    return res.data.trim();
  throw new Error("0x0 upload failed");
}

async function uploadToTransfer(filePath) {
  const form = new FormData();
  form.append("file", fs.createReadStream(filePath));

  const res = await axios.post(`https://transfer.sh/${path.basename(filePath)}`, form, {
    headers: form.getHeaders(),
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
    timeout: 120000,
  });

  if (res.status >= 200 && res.status < 300)
    return typeof res.data === "string" ? res.data.trim() : res.data.url || "unknown";
  throw new Error("transfer.sh upload failed");
}
