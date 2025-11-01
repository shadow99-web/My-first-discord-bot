// commands/transcriptchat.js
const {
  SlashCommandBuilder,
  AttachmentBuilder,
  EmbedBuilder,
  ChannelType,
  PermissionFlagsBits,
} = require("discord.js");
const { createTranscript } = require("discord-html-transcripts");
const { uploadTranscript } = require("../utils/transcriptUploader");
const fs = require("fs-extra");
const path = require("path");

const DEFAULT_CHUNK = parseInt(process.env.TRANSCRIPT_CHUNK_SIZE || "500", 10);
const MAX_TOTAL = parseInt(process.env.TRANSCRIPT_MAX_MESSAGES || "10000", 10);

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
    .addBooleanOption(opt =>
      opt.setName("images").setDescription("Include images/attachments?").setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  // context: { client, message, interaction, args, isPrefix }
  async execute(context) {
    const { client, message, interaction, args, isPrefix } = context;
    const includeImages = (interaction ? interaction.options.getBoolean("images") : null);
    const channel =
      (interaction && interaction.options.getChannel("channel")) ||
      (isPrefix && message.mentions.channels.first()) ||
      (isPrefix && args && args.length
        ? message.guild.channels.cache.get(args[0].replace(/[<#>]/g, ""))
        : null) ||
      (interaction ? interaction.channel : message.channel);

    if (!channel || channel.type !== ChannelType.GuildText) {
      const msg = "⚠️ Please provide a valid text channel.";
      if (interaction) return interaction.reply({ content: msg, ephemeral: true }).catch(()=>{});
      return message.reply(msg).catch(()=>{});
    }

    // Ask user about images if not provided (prefix) OR if null (slash) show default prompt
    let wantImages = true;
    if (includeImages === false) wantImages = false;
    else if (includeImages === true) wantImages = true;
    else {
      // interactive fallback for prefix: ask message author
      if (isPrefix) {
        const ask = await message.channel.send(`${message.author}, include images/attachments in transcript? Reply \`yes\` or \`no\` (30s).`);
        try {
          const filter = m => m.author.id === message.author.id;
          const collected = await message.channel.awaitMessages({ filter, max: 1, time: 30_000, errors: ["time"] });
          const ans = collected.first().content.toLowerCase();
          wantImages = ans.startsWith("y");
          ask.delete().catch(()=>{});
        } catch {
          wantImages = true; // default
          ask.delete().catch(()=>{});
        }
      } else {
        // slash + not set => default true
        wantImages = true;
      }
    }

    // Defer reply for slash
    let statusMessage = null;
    if (interaction) {
      await interaction.deferReply({ ephemeral: true }).catch(()=>{});
      statusMessage = { interaction, isInteraction: true };
      await interaction.editReply({ content: `🔍 Starting transcript generation (images: ${wantImages ? "yes" : "no"})...` }).catch(()=>{});
    } else {
      statusMessage = await message.reply(`🔍 Starting transcript generation (images: ${wantImages ? "yes" : "no"})...`);
    }

    try {
      const fetchLimit = 100; // Discord API limit per fetch
      const chunkSize = DEFAULT_CHUNK; // chunk size for each HTML file
      const maxMessages = MAX_TOTAL;

      let before = null;
      let processed = 0;
      let partIndex = 1;
      const uploadLinks = [];

      while (processed < maxMessages) {
        // fetch chunkSize messages but fetching is done by smaller fetches of fetchLimit
        const toFetch = Math.min(chunkSize, maxMessages - processed);
        // We'll fetch messages in pages, accumulating in `msgsArr`
        let msgsArr = [];
        let lastId = before;

        while (msgsArr.length < toFetch) {
          const remaining = Math.min(fetchLimit, toFetch - msgsArr.length);
          const options = { limit: remaining };
          if (lastId) options.before = lastId;
          const fetched = await channel.messages.fetch(options);
          if (!fetched || fetched.size === 0) break;
          const arr = Array.from(fetched.values());
          msgsArr.push(...arr);
          lastId = arr[arr.length - 1].id;
          // safety: if fetched less than requested and no more messages, break
          if (fetched.size < remaining) break;
        }

        if (msgsArr.length === 0) break;

        // set 'before' for next outer loop to continue older messages
        before = msgsArr[msgsArr.length - 1].id;
        processed += msgsArr.length;

        // create transcript for this chunk
        // Note: discord-html-transcripts accepts channel plus `limit` and `before` options.
        // We'll pass before=the last fetched id + use limit=msgsArr.length
        const transcriptBuffer = await createTranscript(channel, {
          limit: msgsArr.length,
          returnBuffer: true,
          fileName: `${channel.name}-part-${partIndex}.html`,
          poweredBy: false,
          saveImages: !!wantImages,
          before: null, // library might handle based on limit; fallback is fine
        });

        // transcriptBuffer is an object with .attachment (Buffer) or Buffer directly
        let buffer = transcriptBuffer?.attachment || transcriptBuffer || null;
        if (!buffer) {
          // attempt to write the messages manually into a minimal HTML as fallback
          const fallbackHtml = buildMinimalHTML(msgsArr, channel, wantImages);
          buffer = Buffer.from(fallbackHtml, "utf8");
        }

        // upload via uploader
        const filename = `${sanitize(channel.name)}-part-${partIndex}.html`;
        const ures = await uploadTranscript({ buffer, filename });

        // report progress
        const progressText = `✅ Part ${partIndex} created (${msgsArr.length} messages). ` +
          (ures.success ? `Uploaded: ✅\n• ${ures.fileUrl}` : `Uploaded: FAILED — ${ures.error}`);

        uploadLinks.push({ part: partIndex, messages: msgsArr.length, uploaded: ures.success, url: ures.fileUrl || null, error: ures.error || null });

        if (interaction) {
          // update ephemeral reply
          await interaction.editReply({ content: `🔄 Processed: ${processed} messages...\n${progressText}` }).catch(()=>{});
        } else {
          await statusMessage.edit(`${progressText}\nProcessed so far: ${processed} messages.`).catch(()=>{});
        }

        partIndex++;
        // small delay to avoid blast
        await new Promise(r => setTimeout(r, 600));
      }

      // final reply: list of uploaded parts and links
      const embed = new EmbedBuilder()
        .setTitle("📜 Transcript Result")
        .setColor("Aqua")
        .setDescription(`Channel: ${channel}\nProcessed messages: ${processed}`)
        .addFields(
          { name: "Parts", value: `${uploadLinks.length} part(s) created`, inline: true },
          { name: "Include images", value: wantImages ? "Yes" : "No", inline: true }
        )
        .setTimestamp();

      // build a markdown list of parts
      const lines = uploadLinks.map(l => {
        if (l.uploaded) return `• Part ${l.part}: ${l.messages} msgs — ${l.url}`;
        return `• Part ${l.part}: ${l.messages} msgs — FAILED (${l.error})`;
      }).join("\n");

      // Try to send final response publicly with links (non-ephemeral)
      if (interaction) {
        await interaction.followUp({ embeds: [embed], content: `Transcript parts:\n${lines}` }).catch(()=>{});
      } else {
        await message.channel.send({ embeds: [embed], content: `Transcript parts:\n${lines}` }).catch(()=>{});
      }

      // delete status message
      if (interaction) {
        try { await interaction.deleteReply(); } catch(e) {}
      } else {
        try { await statusMessage.delete(); } catch (e) {}
      }
    } catch (err) {
      console.error("❌ TranscriptChat Error:", err);
      const failText = `⚠️ Failed to generate transcript: ${err.message || String(err)}`;
      if (interaction) {
        await interaction.editReply({ content: failText }).catch(()=>{});
      } else {
        await message.reply(failText).catch(()=>{});
      }
    }
  },
};

/** small helpers **/
function sanitize(name = "channel") {
  return name.replace(/[^a-z0-9_\-]/gi, "_").slice(0, 64);
}

function buildMinimalHTML(messagesArray, channel, includeImages) {
  const lines = messagesArray.map(m=>{
    const time = new Date(m.createdTimestamp).toISOString();
    const author = `${m.author.tag}`;
    const content = (m.content || "").replace(/</g,"&lt;").replace(/>/g,"&gt;");
    return `<div class="message"><b>${author}</b> <small>${time}</small><p>${content}</p></div>`;
  }).join("\n");
  return `<!doctype html><html><head><meta charset="utf-8"><title>${channel.name} transcript</title></head><body>${lines}</body></html>`;
}
