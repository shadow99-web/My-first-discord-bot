const {
  SlashCommandBuilder,
  AttachmentBuilder,
  EmbedBuilder,
} = require("discord.js");
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

    // Notify start
    const statusMsg = await (message
      ? message.reply("🔶 Generating transcript, please wait...")
      : interaction.reply({ content: "🔶 Generating transcript, please wait...", fetchReply: true }));

    // Config
    const fetchLimit = 100; // Discord API max
    const chunkSize = 1000; // how many messages per HTML file
    const maxMessages = 10000; // global cap
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

        // Once we hit chunkSize, make a transcript file
        if (collectedMessages.length >= chunkSize) {
          const transcript = await createTranscript(channel, {
            limit: collectedMessages.length,
            returnBuffer: true,
            poweredBy: false,
            fileName: `${channel.name}-part-${chunkIndex}.html`,
          });

          const file = new AttachmentBuilder(transcript, {
            name: `${channel.name}-part-${chunkIndex}.html`,
          });
          files.push(file);

          console.log(`✅ Created transcript part ${chunkIndex} (${collectedMessages.length} msgs)`);

          chunkIndex++;
          collectedMessages = [];
        }
      }

      // If any remaining messages < chunkSize
      if (collectedMessages.length > 0) {
        const transcript = await createTranscript(channel, {
          limit: collectedMessages.length,
          returnBuffer: true,
          poweredBy: false,
          fileName: `${channel.name}-part-${chunkIndex}.html`,
        });

        const file = new AttachmentBuilder(transcript, {
          name: `${channel.name}-part-${chunkIndex}.html`,
        });
        files.push(file);
      }

      if (files.length === 0) {
        return statusMsg.edit("⚠️ No messages found to transcript!");
      }

      const embed = new EmbedBuilder()
        .setColor("Aqua")
        .setTitle("🌟 Transcript Generated")
        .setDescription(
          `🔴 **${files.length} transcript file(s)** created for ${channel}.\nRequested by ${user}.`
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
