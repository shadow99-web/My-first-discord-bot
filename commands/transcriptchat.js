const { createTranscript } = require("discord-html-transcripts");
const { uploadTranscript } = require("../utils/transcriptUploader");
const { Readable } = require("stream");

module.exports = {
  name: "transcriptchat",
  description: "Generate and upload a transcript of the current channel.",
  async execute(interaction) {
    try {
      // 🕓 Acknowledge the command
      if (interaction.isChatInputCommand()) {
        await interaction.deferReply({ flags: 64 }); // ephemeral
      } else {
        await interaction.reply("⏳ Generating transcript...");
      }

      const channel = interaction.channel;

      // 🧾 Create the transcript
      const transcript = await createTranscript(channel, {
        limit: -1,
        returnBuffer: true,
        fileName: `${channel.name}.html`,
      });

      // Convert Buffer → Stream
      const stream = Readable.from(transcript);

      // 📤 Upload to hosting service
      const uploadResult = await uploadTranscript({
        buffer: stream,
        filename: `${channel.name}.html`,
      });

      if (!uploadResult.success) {
        throw new Error(uploadResult.error);
      }

      const message = `✅ Transcript uploaded!\n🔗 ${uploadResult.fileUrl}`;

      if (interaction.isChatInputCommand()) {
        await interaction.editReply({ content: message });
      } else {
        await interaction.channel.send(message);
      }

    } catch (err) {
      console.error("❌ Failed to generate transcript:", err);
      const errorMsg = `❌ Failed to generate transcript: ${err.message}`;
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content: errorMsg });
      } else {
        await interaction.reply(errorMsg);
      }
    }
  },
};
