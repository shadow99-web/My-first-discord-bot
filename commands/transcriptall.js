// commands/transcriptall.js
const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  EmbedBuilder,
} = require("discord.js");
const { createTranscript } = require("discord-html-transcripts");
const { uploadTranscript } = require("../utils/transcriptUploader");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  name: "transcriptall",
  description: "📜 Generate transcripts for all text channels in this server (HTML)",
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

    // ask whether to include images - for slash we could use option but keep interactive
    let includeImages = true;
    if (interaction) {
      await interaction.deferReply({ ephemeral: true }).catch(()=>{});
      await interaction.editReply({ content: `🔍 Generating transcripts for all channels (images: ${includeImages})...` }).catch(()=>{});
    } else {
      const reply = await message.reply(`🔍 Generating transcripts for all channels (images: ${includeImages})...`);
    }

    try {
      const channels = guild.channels.cache.filter(c => c.type === ChannelType.GuildText);
      const results = [];

      for (const [id, channel] of channels) {
        try {
          // create transcript (limit 1000 for performance)
          const safeName = channel.name.replace(/[^a-z0-9_\-]/gi, "_").slice(0,64);
          const bufferObj = await createTranscript(channel, {
            limit: 1000,
            returnBuffer: true,
            fileName: `${safeName}.html`,
            poweredBy: false,
            saveImages: includeImages,
          });

          const buffer = bufferObj?.attachment || bufferObj;
          if (!buffer) throw new Error("No buffer returned");

          const upload = await uploadTranscript({ buffer, filename: `${safeName}.html` });
          results.push({ channel: channel.name, success: upload.success, url: upload.fileUrl || null, error: upload.error || null });
          // small delay
          await new Promise(r => setTimeout(r, 500));
        } catch (err) {
          results.push({ channel: channel.name, success: false, url: null, error: err.message });
        }
      }

      // build response
      const embed = new EmbedBuilder()
        .setTitle("📜 TranscriptAll Results")
        .setColor("Aqua")
        .setDescription(`Requested by ${user}`)
        .setTimestamp();

      const lines = results.map(r => r.success ? `• ${r.channel} — ✅ ${r.url}` : `• ${r.channel} — ❌ ${r.error}`).join("\n");
      if (interaction) await interaction.followUp({ embeds: [embed], content: lines }).catch(()=>{});
      else await message.channel.send({ embeds: [embed], content: lines }).catch(()=>{});

    } catch (err) {
      console.error("❌ TranscriptAll Error:", err);
      const fail = "⚠️ Failed to generate transcripts for all channels.";
      if (interaction) await interaction.followUp({ content: fail, ephemeral: true }).catch(()=>{});
      else await message.reply(fail).catch(()=>{});
    }
  },
};
