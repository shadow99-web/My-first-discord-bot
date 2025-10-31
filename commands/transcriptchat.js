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

    // ✅ Send start message
    const statusMsg = await (message
      ? message.reply("🧾 Generating transcript, please wait...")
      : interaction.reply({ content: "🧾 Generating transcript, please wait...", fetchReply: true }));

    // ---------- CONFIG ----------
    const chunkSize = 1000; // messages per file
    const maxMessages = 10000; // safety limit
    let beforeId = null;
    let chunkIndex = 1;
    const files = [];

    try {
      while (true) {
        // Fetch messages (newest to oldest)
        const fetched = await channel.messages.fetch({
          limit: chunkSize,
          ...(beforeId && { before: beforeId }),
        });

        if (fetched.size === 0) break;

        const messages = Array.from(fetched.values());
        beforeId = messages[messages.length - 1].id;

        // Create one transcript per chunk
        const transcript = await createTranscript(channel, {
          limit: messages.length,
          before: beforeId,
          filename: `${channel.name}-part-${chunkIndex}.html`,
          returnBuffer: true,
          poweredBy: false,
        });

        const file = new AttachmentBuilder(transcript, {
          name: `${channel.name}-part-${chunkIndex}.html`,
        });
        files.push(file);

        console.log(`✅ Generated transcript part ${chunkIndex} (${messages.length} messages)`);

        chunkIndex++;
        if (chunkIndex * chunkSize > maxMessages) break; // avoid massive overload
      }

      // ---------- Send result ----------
      if (files.length === 0) {
        return statusMsg.edit("⚠️ No messages found to transcript!");
      }

      const embed = new EmbedBuilder()
        .setColor("Aqua")
        .setTitle("🌟 Transcript Generated")
        .setDescription(
          `🪄 **${files.length} transcript file(s)** created for ${channel}.\nRequested by ${user}.`
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
