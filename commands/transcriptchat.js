const {
  SlashCommandBuilder,
  AttachmentBuilder,
  EmbedBuilder,
  ChannelType,
  PermissionFlagsBits,
} = require("discord.js");
const { createTranscript } = require("discord-html-transcripts");

module.exports = {
  name: "transcriptchat",
  description: "📜 Generate an HTML transcript of this channel (works for all server sizes)",
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
        return interaction.reply({ content: msg, ephemeral: true });
      else return message.reply(msg);
    }

    // 🕐 Notify start
    const statusMsg = await (message
      ? message.reply("🕐 Generating transcript, please wait...")
      : interaction.reply({
          content: "🕐 Generating transcript, please wait...",
          ephemeral: true,
          fetchReply: true,
        }));

    try {
      const fetchLimit = 100; // per request
      const chunkSize = 1000; // messages per file
      const maxMessages = 10000;
      let beforeId = null;
      let chunkIndex = 1;
      let collectedMessages = [];
      const files = [];

      while (collectedMessages.length < maxMessages) {
        const fetched = await channel.messages.fetch({
          limit: fetchLimit,
          ...(beforeId && { before: beforeId }),
        });
        if (fetched.size === 0) break;

        const messages = Array.from(fetched.values());
        collectedMessages.push(...messages);
        beforeId = messages[messages.length - 1].id;

        // if we hit chunk limit
        if (collectedMessages.length >= chunkSize) {
          const transcriptFile = await createTranscript(channel, {
            limit: collectedMessages.length,
            returnBuffer: false, // ✅ stream, not memory buffer
            fileName: `${channel.name}-part-${chunkIndex}.html`,
            poweredBy: false,
            saveImages: true,
          });

          if (transcriptFile)
            files.push(transcriptFile);

          console.log(`✅ Created transcript part ${chunkIndex}`);
          chunkIndex++;
          collectedMessages = [];
        }
      }

      // leftover messages
      if (collectedMessages.length > 0) {
        const transcriptFile = await createTranscript(channel, {
          limit: collectedMessages.length,
          returnBuffer: false,
          fileName: `${channel.name}-part-${chunkIndex}.html`,
          poweredBy: false,
          saveImages: true,
        });

        if (transcriptFile)
          files.push(transcriptFile);
      }

      if (files.length === 0) {
        if (interaction)
          return interaction.followUp("⚠️ No valid transcript files could be created.");
        else
          return message.reply("⚠️ No valid transcript files could be created.");
      }

      const embed = new EmbedBuilder()
        .setColor("Aqua")
        .setTitle("📜 Transcript Generated")
        .setDescription(
          `🗂️ **${files.length} transcript file(s)** generated for ${channel}\n Requested by: ${user}`
        )
        .setTimestamp();

      if (message)
        await message.channel.send({ embeds: [embed], files });
      else
        await interaction.followUp({ embeds: [embed], files });

      await statusMsg.delete().catch(() => {});
    } catch (err) {
      console.error("❌ Transcript error:", err);
      const failText = "⚠️ Failed to generate transcript. Please try again later.";
      if (message)
        await message.reply(failText).catch(() => {});
      else
        await interaction.followUp({ content: failText, ephemeral: true }).catch(() => {});
    }
  },
};
