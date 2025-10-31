const {
  SlashCommandBuilder,
  EmbedBuilder,
  ChannelType,
  PermissionFlagsBits,
} = require("discord.js");
const { createTranscript } = require("discord-html-transcripts");
const fs = require("fs");

module.exports = {
  name: "transcriptchat",
  description: "📜 Generate an HTML transcript of this channel (supports large servers)",
  usage: "transcriptchat [#channel]",
  options: [
    {
      name: "channel",
      description: "Select a channel to generate transcript",
      type: 7,
      required: false,
    },
  ],

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
    if (interaction) await interaction.deferReply({ ephemeral: false }).catch(() => {});
    const statusMsg =
      interaction || (await message.reply("🕐 Generating transcript, please wait..."));

    try {
      const fetchLimit = 100;
      const chunkSize = 1000;
      const maxMessages = 10000;
      let beforeId = null;
      let chunkIndex = 1;
      let collectedMessages = [];
      const uploadedLinks = [];

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
          const filename = `${channel.name}-part-${chunkIndex}.html`;
          const filePath = `./${filename}`;

          const transcript = await createTranscript(channel, {
            limit: collectedMessages.length,
            returnBuffer: false,
            fileName: filename,
            saveImages: true,
            poweredBy: false,
          });

          fs.renameSync(transcript.path, filePath);
          const link = await uploadTo0x0(filePath);
          uploadedLinks.push(`[Part ${chunkIndex}](${link})`);

          console.log(`✅ Uploaded transcript part ${chunkIndex} to 0x0.st`);
          fs.unlinkSync(filePath);
          collectedMessages = [];
          chunkIndex++;
        }
      }

      // leftover
      if (collectedMessages.length > 0) {
        const filename = `${channel.name}-part-${chunkIndex}.html`;
        const filePath = `./${filename}`;

        const transcript = await createTranscript(channel, {
          limit: collectedMessages.length,
          returnBuffer: false,
          fileName: filename,
          saveImages: true,
          poweredBy: false,
        });

        fs.renameSync(transcript.path, filePath);
        const link = await uploadTo0x0(filePath);
        uploadedLinks.push(`[Part ${chunkIndex}](${link})`);
        fs.unlinkSync(filePath);
      }

      const embed = new EmbedBuilder()
        .setColor("Aqua")
        .setTitle("📜 Transcript Generated")
        .setDescription(
          `🗂️ Transcript for ${channel}\n\n${uploadedLinks.join("\n")}\n\nRequested by: ${user}`
        )
        .setTimestamp();

      if (interaction)
        await interaction.editReply({ content: "", embeds: [embed] }).catch(() => {});
      else await statusMsg.edit({ content: "", embeds: [embed] }).catch(() => {});
    } catch (err) {
      console.error("❌ Transcript error:", err);
      const failText = "⚠️ Failed to generate transcript. Please try again later.";
      if (interaction)
        await interaction.editReply({ content: failText, ephemeral: true }).catch(() => {});
      else await message.reply(failText).catch(() => {});
    }
  },
};

// 🔗 Upload helper for 0x0.st
async function uploadTo0x0(filePath) {
  const fileStream = fs.createReadStream(filePath);
  const res = await fetch("https://0x0.st", {
    method: "POST",
    body: fileStream,
  });
  return res.text();
                                     }
