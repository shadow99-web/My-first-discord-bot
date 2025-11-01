const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  EmbedBuilder,
} = require("discord.js");
const { createTranscript } = require("discord-html-transcripts");
const { uploadTranscript } = require("../utils/transcriptUploader");
const { Readable } = require("stream");

const CHUNK_SIZE = 1000; // 💾 messages per chunk
const MAX_MESSAGES = 10000; // total limit safeguard

module.exports = {
  name: "transcriptchat",
  description: "📜 Generate and upload a transcript of the current channel (supports large channels)",
  usage: "/transcriptchat [#channel]",
  data: new SlashCommandBuilder()
    .setName("transcriptchat")
    .setDescription("📜 Generate and upload a transcript of the current channel (supports large channels)")
    .addChannelOption((opt) =>
      opt
        .setName("channel")
        .setDescription("Select a text channel")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    )
    .addBooleanOption(opt =>
      opt
        .setName("images")
        .setDescription("Include images and attachments?")
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute({ interaction, message, isPrefix }) {
    const isSlash = !!interaction;
    const user = isSlash ? interaction.user : message.author;

    const targetChannel =
      (isSlash && interaction.options.getChannel("channel")) ||
      (isPrefix && message.mentions.channels.first()) ||
      (isPrefix && message.channel) ||
      (isSlash && interaction.channel);

    const includeImages = isSlash
      ? interaction.options.getBoolean("images") ?? true
      : true;

    if (!targetChannel || targetChannel.type !== ChannelType.GuildText) {
      const msg = "⚠️ Please provide a valid text channel.";
      if (isSlash) return interaction.reply({ content: msg, flags: 64 });
      else return message.reply(msg);
    }

    // Initial notice
    if (isSlash) {
      await interaction.deferReply({ flags: 64 }).catch(() => {});
      await interaction.editReply(`⏳ Starting transcript for ${targetChannel} (images: ${includeImages ? "✅" : "❌"})...`);
    } else {
      await message.reply(`⏳ Starting transcript for ${targetChannel} (images: ${includeImages ? "✅" : "❌"})...`);
    }

    let before = null;
    let processed = 0;
    let part = 1;
    const results = [];

    try {
      while (processed < MAX_MESSAGES) {
        // fetch messages
        const fetched = await targetChannel.messages.fetch({ limit: CHUNK_SIZE, before }).catch(() => null);
        if (!fetched || fetched.size === 0) break;

        const messagesArr = Array.from(fetched.values());
        before = messagesArr[messagesArr.length - 1].id;
        processed += messagesArr.length;

        // generate transcript chunk
        const buffer = await createTranscript(targetChannel, {
          limit: messagesArr.length,
          returnBuffer: true,
          fileName: `${targetChannel.name}-part-${part}.html`,
          saveImages: includeImages,
          poweredBy: false,
        });

        const stream = Readable.from(buffer);
        const upload = await uploadTranscript({
          buffer: stream,
          filename: `${sanitize(targetChannel.name)}-part-${part}.html`,
        });

        results.push({
          part,
          success: upload.success,
          url: upload.fileUrl,
          error: upload.error,
          count: messagesArr.length,
        });

        if (isSlash) {
          await interaction.editReply({
            content: `📄 Processed ${processed} messages... (Part ${part}: ${upload.success ? "✅" : "❌"})`,
          });
        } else {
          await message.channel.send(`📄 Processed ${processed} messages... (Part ${part}: ${upload.success ? "✅" : "❌"})`);
        }

        part++;
        await new Promise((r) => setTimeout(r, 800)); // small delay
      }

      // ✅ Final summary
      const embed = new EmbedBuilder()
        .setTitle("📜 Transcript Summary")
        .setColor("Aqua")
        .setDescription(`Channel: ${targetChannel}\nProcessed: ${processed} messages\nImages: ${includeImages ? "✅" : "❌"}`)
        .addFields(
          { name: "Parts", value: `${results.length}`, inline: true },
          { name: "Requested by", value: `${user}`, inline: true }
        )
        .setTimestamp();

      const links = results
        .map(
          (r) =>
            `• Part ${r.part}: ${r.count} msgs — ${
              r.success ? `[View](${r.url})` : `❌ ${r.error}`
            }`
        )
        .join("\n");

      if (isSlash) {
        await interaction.followUp({ embeds: [embed], content: links });
      } else {
        await message.channel.send({ embeds: [embed], content: links });
      }
    } catch (err) {
      console.error("❌ TranscriptChat Error:", err);
      const fail = `❌ Failed to generate transcript: ${err.message}`;
      if (isSlash && (interaction.deferred || interaction.replied))
        await interaction.editReply({ content: fail });
      else if (isSlash)
        await interaction.reply({ content: fail, flags: 64 });
      else await message.reply(fail);
    }
  },
};

function sanitize(name) {
  return name.replace(/[^a-z0-9_\-]/gi, "_").slice(0, 64);
}
