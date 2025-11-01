const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("transcriptall")
    .setDescription("📜 Save all channels’ messages as transcripts (Admin only)")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const guild = interaction.guild;
    let zipName = `${guild.name.replace(/\s/g, "_")}_transcripts.zip`;

    const JSZip = require("jszip");
    const zip = new JSZip();

    for (const [id, channel] of guild.channels.cache) {
      if (!channel.isTextBased()) continue;
      try {
        const messages = await channel.messages.fetch({ limit: 100 });
        const sorted = messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
        let html = `<html><body><h3>#${channel.name}</h3><hr>`;
        sorted.forEach(m => {
          html += `<p><strong>${m.author.tag}</strong>: ${m.cleanContent}</p>`;
        });
        html += "</body></html>";
        zip.file(`${channel.name}.html`, html);
      } catch {}
    }

    const zipPath = path.join(__dirname, zipName);
    const content = await zip.generateAsync({ type: "nodebuffer" });
    fs.writeFileSync(zipPath, content);

    const form = new FormData();
    form.append("file", fs.createReadStream(zipPath));

    try {
      const upload = await axios.post("http://us6.galactichosting.net:30028/upload", form, {
        headers: form.getHeaders(),
      });

      const embed = new EmbedBuilder()
        .setColor("Blue")
        .setTitle("📁 All Transcripts Uploaded")
        .addFields({ name: "Guild", value: guild.name })
        .addFields({ name: "Link", value: `[Download ZIP](${upload.data.fileUrl})` });

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await interaction.editReply("❌ Failed to upload transcripts.");
    }

    fs.unlinkSync(zipPath);
  },
};
