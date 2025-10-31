const {
  SlashCommandBuilder,
  AttachmentBuilder,
  EmbedBuilder,
} = require("discord.js");
const { createTranscript } = require("discord-html-transcripts");

module.exports = {
  name: "transcriptchat",
  description:
    "Generate an HTML transcript of this channel (automatically splits for large chats)",
  usage: "transcriptchat",
  data: new SlashCommandBuilder()
    .setName("transcriptchat")
    .setDescription("Generate a full HTML transcript of the current chat"),

  async execute({ client, message, interaction, args, isPrefix }) {
    const channel = message ? message.channel : interaction.channel;
    const user = message ? message.author : interaction.user;

    if (!channel) return;

    // ⏳ Notify start
    const statusMsg = await (message
      ? message.reply("🔶 Generating transcript, please wait...")
      : interaction.reply({
          content: "🔶 Generating transcript, please wait...",
          fetchReply: true,
        }));

    // ⚙️ Config (safe for free hosts like Render)
    const FETCH_LIMIT = 100; // Discord max per request
    const CHUNK_SIZE = 1000; // how many messages per transcript part
    const MAX_MESSAGES = 3000; // safe upper cap for Render free plan
    const files = [];
    let allMessages = [];
    let beforeId = null;
    let chunkIndex = 1;

    try {
      // 🔁 Fetch messages in batches
      while (allMessages.length < MAX_MESSAGES) {
        const fetched = await channel.messages
          .fetch({
            limit: FETCH_LIMIT,
            ...(beforeId && { before: beforeId }),
          })
          .catch(() => null);

        if (!fetched || fetched.size === 0) break;

        const messages = Array.from(fetched.values());
        allMessages.push(...messages);
        beforeId = messages[messages.length - 1]?.id;

        // 🧩 If chunk full, make transcript now
        if (allMessages.length >= CHUNK_SIZE) {
          const transcriptBuffer = await createTranscript(channel, {
            limit: allMessages.length,
            returnBuffer: true,
            poweredBy: false,
            fileName: `${channel.name}-part-${chunkIndex}.html`,
          }).catch((e) => {
            console.error("Transcript chunk failed:", e);
            return null;
          });

          if (transcriptBuffer instanceof Buffer) {
            const file = new AttachmentBuilder(transcriptBuffer, {
              name: `${channel.name}-part-${chunkIndex}.html`,
            });
            files.push(file);
            console.log(
              `✅ Created transcript part ${chunkIndex} (${allMessages.length} msgs)`
            );
          }

          // reset for next batch
          chunkIndex++;
          allMessages = [];
        }
      }

      // 🧩 Handle last remaining messages (< chunk size)
      if (allMessages.length > 0) {
        const transcriptBuffer = await createTranscript(channel, {
          limit: allMessages.length,
          returnBuffer: true,
          poweredBy: false,
          fileName: `${channel.name}-part-${chunkIndex}.html`,
        }).catch((e) => {
          console.error("Final transcript part failed:", e);
          return null;
        });

        if (transcriptBuffer instanceof Buffer) {
          const file = new AttachmentBuilder(transcriptBuffer, {
            name: `${channel.name}-part-${chunkIndex}.html`,
          });
          files.push(file);
        }
      }

      if (files.length === 0) {
        await statusMsg.edit("⚠️ No valid transcript files could be created!");
        return;
      }

      // 📦 Send final embed + files
      const embed = new EmbedBuilder()
        .setColor("Aqua")
        .setTitle("📜 Transcript Generated")
        .setDescription(
          `🗂️ **${files.length} transcript file(s)** created for ${channel}.\nRequested by ${user}.`
        )
        .setTimestamp();

      if (message) {
        await message.channel.send({ embeds: [embed], files });
      } else {
        await interaction.followUp({ embeds: [embed], files });
      }

      await statusMsg.delete().catch(() => {});
    } catch (err) {
      console.error("❌ Transcript Error:", err);
      const failText =
        "⚠️ Failed to generate transcript. Please try again later.";
      if (message)
        await message.reply(failText).catch(() => {});
      else await interaction.followUp(failText).catch(() => {});
    }
  },
};
