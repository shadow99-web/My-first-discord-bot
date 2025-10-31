const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { createTranscript } = require("discord-html-transcripts");

module.exports = {
  name: "transcriptchat",
  description: "Generate an HTML transcript of this channel (split for big servers)",
  usage: "transcriptchat",
  data: new SlashCommandBuilder()
    .setName("transcriptchat")
    .setDescription("Generate a full HTML transcript of the current chat"),
  async execute({ client, message, interaction, args, isPrefix }) {
    const channel = message ? message.channel : interaction.channel;
    const user = message ? message.author : interaction.user;

    if (!channel) return;

    const statusMsg = await (message
      ? message.reply("🔶 Generating transcript, please wait...")
      : interaction.reply({
          content: "🔶 Generating transcript, please wait...",
          fetchReply: true,
        }));

    // === Config ===
    const fetchLimit = 100; // Discord max fetch per call
    const chunkSize = 1000; // How many messages per transcript
    const maxMessages = 10000; // Global safety cap
    let beforeId = null;
    let chunkIndex = 1;
    let collectedMessages = [];
    const files = [];

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

        // Make chunk transcript if needed
        if (collectedMessages.length >= chunkSize) {
          const transcriptBuffer = await createTranscript(channel, {
            limit: collectedMessages.length,
            returnBuffer: true,
            poweredBy: false,
            fileName: `${channel.name}-part-${chunkIndex}.html`,
          });

          files.push({
            attachment: transcriptBuffer,
            name: `${channel.name}-part-${chunkIndex}.html`,
          });

          console.log(`✅ Created transcript part ${chunkIndex} (${collectedMessages.length} msgs)`);

          chunkIndex++;
          collectedMessages = [];
        }
      }

      // Remaining messages
      if (collectedMessages.length > 0) {
        const transcriptBuffer = await createTranscript(channel, {
          limit: collectedMessages.length,
          returnBuffer: true,
          poweredBy: false,
          fileName: `${channel.name}-part-${chunkIndex}.html`,
        });

        files.push({
          attachment: transcriptBuffer,
          name: `${channel.name}-part-${chunkIndex}.html`,
        });
      }

      if (files.length === 0)
        return statusMsg.edit("⚠️ No messages found to transcript!");

      const embed = new EmbedBuilder()
        .setColor("Aqua")
        .setTitle("🌟 Transcript Generated")
        .setDescription(
          `🗂️ **${files.length} transcript file(s)** created for ${channel}.\n👤 Requested by ${user}.`
        )
        .setTimestamp();

      if (message) {
        await message.channel.send({ embeds: [embed], files });
      } else {
        await interaction.followUp({ embeds: [embed], files });
      }

      await statusMsg.delete().catch(() => {});
    } catch (err) {
      console.error("❌ Transcript error:", err);
      const failText = "⚠️ Failed to generate transcript. Please try again later.";
      if (message) await message.reply(failText).catch(() => {});
      else await interaction.followUp(failText).catch(() => {});
    }
  },
};
