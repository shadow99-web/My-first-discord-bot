const {
  SlashCommandBuilder,
  AttachmentBuilder,
  EmbedBuilder,
  ChannelType,
  PermissionFlagsBits,
} = require("discord.js");
const { createTranscript } = require("discord-html-transcripts");
const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

async function uploadToBashupload(filePath) {
  const fileStream = fs.createReadStream(filePath);
  const response = await axios.post("https://bashupload.com/", fileStream, {
    headers: { "Content-Type": "application/octet-stream" },
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
  });
  const match = response.data.match(/https?:\/\/bashupload\.com\/\S+/);
  return match ? match[0] : null;
}

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

  async execute({ client, interaction, message, args, isPrefix }) {
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

    if (interaction) await interaction.deferReply({ ephemeral: false }).catch(() => {});

    const tempDir = path.join(__dirname, "transcripts_temp");
    await fs.ensureDir(tempDir);

    const fetchLimit = 100;
    const chunkSize = 1000;
    const maxMessages = 10000;
    let beforeId = null;
    let chunkIndex = 1;
    let collectedMessages = [];
    const urls = [];

    try {
      while (collectedMessages.length < maxMessages) {
        const fetched = await channel.messages.fetch({
          limit: fetchLimit,
          ...(beforeId && { before: beforeId }),
        });
        if (fetched.size === 0) break;

        const messages = Array.from(fetched.values());
        collectedMessages.push(...messages);
        beforeId = messages[messages.length - 1].id;

        if (collectedMessages.length >= chunkSize) {
          const filePath = path.join(
            tempDir,
            `${channel.name}-part-${chunkIndex}.html`
          );
          const transcript = await createTranscript(channel, {
            limit: collectedMessages.length,
            fileName: path.basename(filePath),
            saveImages: true,
            returnBuffer: false,
            poweredBy: false,
          });

          // Upload to bashupload
          const url = await uploadToBashupload(transcript.attachment);
          if (url) urls.push(`📄 [Part ${chunkIndex}](${url})`);
          await fs.remove(transcript.attachment);
          chunkIndex++;
          collectedMessages = [];
        }
      }

      // leftover
      if (collectedMessages.length > 0) {
        const filePath = path.join(tempDir, `${channel.name}-part-${chunkIndex}.html`);
        const transcript = await createTranscript(channel, {
          limit: collectedMessages.length,
          fileName: path.basename(filePath),
          saveImages: true,
          returnBuffer: false,
          poweredBy: false,
        });

        const url = await uploadToBashupload(transcript.attachment);
        if (url) urls.push(`📄 [Part ${chunkIndex}](${url})`);
        await fs.remove(transcript.attachment);
      }

      if (urls.length === 0) {
        const noFilesMsg = "⚠️ No valid transcript files could be created.";
        if (interaction)
          return interaction.editReply({ content: noFilesMsg }).catch(() => {});
        else return message.reply(noFilesMsg).catch(() => {});
      }

      const embed = new EmbedBuilder()
        .setColor("Aqua")
        .setTitle("📜 Transcript Generated")
        .setDescription(
          `🗂️ **${urls.length} transcript part(s)** generated for ${channel}\n\n${urls.join(
            "\n"
          )}\n\nRequested by: ${user}`
        )
        .setTimestamp();

      if (interaction) await interaction.editReply({ embeds: [embed] }).catch(() => {});
      else await message.channel.send({ embeds: [embed] }).catch(() => {});

      await fs.remove(tempDir);
    } catch (err) {
      console.error("❌ Transcript error:", err);
      const failText = "⚠️ Failed to generate transcript. Please try again later.";
      if (interaction)
        await interaction.editReply({ content: failText }).catch(() => {});
      else await message.reply(failText).catch(() => {});
    }
  },
};
