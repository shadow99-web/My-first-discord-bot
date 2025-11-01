const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("transcriptchat")
    .setDescription("📄 Save current chat messages as a transcript and upload it."),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const channel = interaction.channel;
    const messages = await channel.messages.fetch({ limit: 100 });
    const sorted = messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);

    let content = `
      <html><head><title>Transcript - ${channel.name}</title></head><body>
      <h2>Transcript of #${channel.name}</h2><hr>
    `;

    sorted.forEach(msg => {
      content += `<p><strong>${msg.author.tag}</strong>: ${msg.cleanContent}</p>`;
    });
    content += "</body></html>";

    const filePath = path.join(__dirname, `${channel.id}_transcript.html`);
    fs.writeFileSync(filePath, content);

    // Upload to Shadow hosting
    const form = new FormData();
    form.append("file", fs.createReadStream(filePath));

    try {
      const upload = await axios.post("http://us6.galactichosting.net:30028/upload", form, {
        headers: form.getHeaders(),
      });

      const embed = new EmbedBuilder()
        .setColor("Green")
        .setTitle("🟢 Transcript Uploaded Successfully")
        .addFields({ name: "Channel", value: `#${channel.name}` })
        .addFields({ name: "Link", value: `[View Transcript](${upload.data.fileUrl})` })
        .setFooter({ text: "S H A D O W Transcript System" });

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await interaction.editReply("❌ Upload failed. Try again later.");
    }

    fs.unlinkSync(filePath);
  },
};
