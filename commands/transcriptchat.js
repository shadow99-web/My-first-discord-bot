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
const axios = require("axios");
const FormData = require("form-data");

// Config
const CHUNK_SIZE = 500; // messages per HTML part (you chose 500)
const FETCH_LIMIT = 100; // Discord API max per fetch (100)
const MAX_MESSAGES = 10000; // safety cap (adjust if you want)

module.exports = {
  name: "transcriptchat",
  description: "📜 Create HTML transcript parts of a channel (uploads each part to 0x0.st)",
  usage: "transcriptchat [#channel]",
  data: new SlashCommandBuilder()
    .setName("transcriptchat")
    .setDescription("📜 Generate HTML transcript parts of a channel and upload them (0x0.st)")
    .addChannelOption((opt) =>
      opt
        .setName("channel")
        .setDescription("Choose a channel (defaults to current)")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  // Unified execute for prefix & slash (interaction or message)
  async execute({ client, message, interaction, args, isPrefix }) {
    const isInteraction = !!interaction;
    const user = isInteraction ? interaction.user : message.author;

    // Determine target channel
    const channel =
      (isInteraction && interaction.options.getChannel("channel")) ||
      (isPrefix && (message.mentions.channels.first() ||
        (args && args.length ? message.guild.channels.cache.get(args[0].replace(/[<#>]/g, "")) : null))) ||
      (isInteraction ? interaction.channel : message.channel);

    if (!channel || channel.type !== ChannelType.GuildText) {
      const err = "⚠️ Please provide or run this command in a valid text channel.";
      if (isInteraction) return interaction.reply({ content: err, ephemeral: true }).catch(() => {});
      return message.reply(err).catch(() => {});
    }

    // Defer / initial status message
    let status;
    if (isInteraction) {
      await interaction.deferReply({ ephemeral: true }).catch(() => {});
      status = await interaction.fetchReply();
    } else {
      status = await message.reply("🕐 Generating transcript parts — starting...").catch(() => null);
    }

    // Prepare temp folder
    const tempDir = path.join(__dirname, "..", "transcripts_temp");
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    try {
      // Iterate pages of channel messages and split into CHUNK_SIZE parts
      let beforeId = null;
      let totalFetched = 0;
      let partIndex = 1;
      const uploadedParts = [];

      while (totalFetched < MAX_MESSAGES) {
        // Collect up to CHUNK_SIZE messages in chunks by repeatedly fetching FETCH_LIMIT
        const messagesCollected = [];

        while (messagesCollected.length < CHUNK_SIZE && totalFetched < MAX_MESSAGES) {
          const limit = Math.min(FETCH_LIMIT, CHUNK_SIZE - messagesCollected.length, MAX_MESSAGES - totalFetched);
          const fetched = await channel.messages.fetch({ limit, ...(beforeId && { before: beforeId }) });
          if (!fetched || fetched.size === 0) break;

          const arr = Array.from(fetched.values());
          messagesCollected.push(...arr);
          beforeId = arr[arr.length - 1].id;
          totalFetched += arr.length;

          // If we reached MAX_MESSAGES overall stop
          if (totalFetched >= MAX_MESSAGES) break;
        }

        if (messagesCollected.length === 0) break;

        // Create transcript for these CHUNK (we pass limit equal to collected count)
        const fileName = `${channel.name}-part-${partIndex}.html`;
        // createTranscript will fetch messages again based on limit; that's fine because we've paged the beforeId.
        const transcript = await createTranscript(channel, {
          limit: messagesCollected.length,
          returnBuffer: true, // get Buffer so we can upload
          fileName,
          poweredBy: false,
          saveImages: true, // include images
        });

        if (!transcript || !transcript.attachment) {
          console.warn(`⚠️ Part ${partIndex} creation returned no attachment`);
          // Update progress
          const text = `⚠️ Could not create part ${partIndex}. Continuing...`;
          if (isInteraction) await interaction.editReply({ content: text }).catch(() => {});
          else if (status) await status.edit(text).catch(() => {});
          partIndex++;
          continue;
        }

        // Save temporarily
        const partPath = path.join(tempDir, fileName);
        fs.writeFileSync(partPath, transcript.attachment);

        // Upload to external host (try 0x0.st then fallback to transfer.sh)
        let uploadUrl = null;
        try {
          uploadUrl = await uploadTo0x0(partPath);
        } catch (err) {
          console.warn("0x0 upload failed, trying transfer.sh", err?.message || err);
          try {
            uploadUrl = await uploadToTransfer(partPath);
          } catch (err2) {
            console.error("Both uploads failed for part", partIndex, err2);
          }
        }

        // Keep record
        uploadedParts.push({ part: partIndex, file: fileName, url: uploadUrl });

        // Remove temp file
        try { fs.unlinkSync(partPath); } catch {}

        // Update progress message
        const progressText = `✅ Part ${partIndex} created (${messagesCollected.length} messages). Uploaded: ${uploadUrl ? uploadUrl : "FAILED"}. Processed so far: ${totalFetched} messages.`;
        if (isInteraction) await interaction.editReply({ content: progressText }).catch(() => {});
        else if (status) await status.edit(progressText).catch(() => {});

        partIndex++;
        // Continue while loop to gather next chunk
      }

      if (uploadedParts.length === 0) {
        const msg = "⚠️ No transcript parts could be created.";
        if (isInteraction) return interaction.editReply({ content: msg });
        return status ? status.edit(msg) : null;
      }

      // Build final embed with list of parts & links
      const embed = new EmbedBuilder()
        .setTitle("📜 Transcript Parts Ready")
        .setDescription(`Generated ${uploadedParts.length} part(s) for ${channel}.`)
        .setColor("Aqua")
        .setTimestamp();

      // Add up to 10 fields (Discord embed limit); otherwise attach text body with links
      const lines = uploadedParts.map(p => `Part ${p.part}: ${p.url ? p.url : "Upload failed"}`);
      if (lines.length <= 10) {
        lines.forEach((l) => embed.addFields({ name: "Part", value: l }));
      }

      // Final reply: if too many parts, send embed plus a text file listing all links
      if (lines.length > 10) {
        const listText = lines.join("\n");
        const listPath = path.join(tempDir, `${channel.name}_parts_list_${Date.now()}.txt`);
        fs.writeFileSync(listPath, listText, "utf8");

        if (isInteraction) {
          await interaction.editReply({ content: "✅ All parts uploaded — see links below.", embeds: [embed], files: [listPath] }).catch(() => {});
        } else {
          await (status ? status.edit("✅ All parts uploaded — see links below.") : message.channel.send("✅ All parts uploaded."));
          await message.channel.send({ embeds: [embed], files: [listPath] }).catch(() => {});
        }

        try { fs.unlinkSync(listPath); } catch {}
      } else {
        if (isInteraction) {
          await interaction.editReply({ content: "✅ All parts uploaded.", embeds: [embed] }).catch(() => {});
          // send a follow-up with the explicit links (so they are clickable)
          const linkMsg = uploadedParts.map(p => `${p.file}: ${p.url ? p.url : "FAILED"}`).join("\n");
          await interaction.followUp({ content: "Download links:\n" + linkMsg, ephemeral: true }).catch(() => {});
        } else {
          await (status ? status.edit("✅ All parts uploaded.") : message.channel.send("✅ All parts uploaded."));
          await message.channel.send({ embeds: [embed], content: uploadedParts.map(p => `${p.file}: ${p.url ? p.url : "FAILED"}`).join("\n") }).catch(() => {});
        }
      }

    } catch (err) {
      console.error("❌ TranscriptChat Error:", err);
      const failText = "⚠️ Failed to generate transcripts. Try again later.";
      if (isInteraction) await interaction.editReply({ content: failText }).catch(() => {});
      else if (status) await status.edit(failText).catch(() => {});
    } finally {
      // cleanup temp directory (best-effort)
      try {
        const items = fs.readdirSync(tempDir);
        for (const it of items) {
          const p = path.join(tempDir, it);
          try { fs.unlinkSync(p); } catch {}
        }
      } catch {}
    }
  },
};

// ----------------- Helper upload functions -----------------

async function uploadTo0x0(filePath) {
  // 0x0.st accepts a simple form upload (field name "file")
  const form = new FormData();
  form.append("file", fs.createReadStream(filePath));

  const headers = form.getHeaders();
  const res = await axios.post("https://0x0.st", form, {
    headers,
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
    timeout: 120000,
  });

  // response body is the URL plain text
  if (res.status >= 200 && res.status < 300 && typeof res.data === "string") {
    const url = res.data.trim();
    return url;
  }
  throw new Error("0x0 upload failed: " + (res.statusText || res.status));
}

async function uploadToTransfer(filePath) {
  // fallback: transfer.sh
  const form = new FormData();
  form.append("file", fs.createReadStream(filePath));

  const headers = form.getHeaders();
  const res = await axios.post(`https://transfer.sh/${path.basename(filePath)}`, form, {
    headers,
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
    timeout: 120000,
  });

  if (res.status >= 200 && res.status < 300 && res.data) return (typeof res.data === "string" ? res.data.trim() : res.data.url || res.data.link);
  throw new Error("transfer.sh upload failed");
    }
