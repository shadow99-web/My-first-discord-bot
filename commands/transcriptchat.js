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
  description: "📜 Generate an HTML transcript of this channel (works for large servers)",
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
    let statusMsg;
    if (interaction) {
      await interaction.deferReply({ ephemeral: true }).catch(() => {});
      statusMsg = interaction;
    } else {
      statusMsg = await message.reply("🕐 Generating transcript, please wait...");
    }

    try {
      const fetchLimit = 100;
      const chunkSize = 1000;
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

        if (collectedMessages.length >= chunkSize) {
          const transcriptFile = await createTranscript(channel, {
            limit: collectedMessages.length,
            returnBuffer: false,
            fileName: `${channel.name}-part-${chunkIndex}.html`,
            poweredBy: false,
            saveImages: true,
          });

          if (transcriptFile) files.push(transcriptFile);

          console.log(`✅ Created transcript part ${chunkIndex}`);
          chunkIndex++;
          collectedMessages = [];
        }
      }

      // leftover
      if (collectedMessages.length > 0) {
        const transcriptFile = await createTranscript(channel, {
          limit: collectedMessages.length,
          returnBuffer: false,
          fileName: `${channel.name}-part-${chunkIndex}.html`,
          poweredBy: false,
          saveImages: true,
        });

        if (transcriptFile) files.push(transcriptFile);
      }

      if (files.length === 0) {
        const noFilesMsg = "⚠️ No valid transcript files could be created.";
        if (interaction)
          return interaction.editReply({ content: noFilesMsg }).catch(() => {});
        else return message.reply(noFilesMsg).catch(() => {});
      }

      const embed = new EmbedBuilder()
        .setColor("Aqua")
        .setTitle("📜 Transcript Generated")
        .setDescription(
          `🗂️ **${files.length} transcript file(s)** generated for ${channel}\nRequested by: ${user}`
        )
        .setTimestamp();

      if (interaction)
        await interaction.editReply({ content: "", embeds: [embed], files }).catch(() => {});
      else
        await message.channel.send({ embeds: [embed], files }).catch(() => {});

      if (message) await statusMsg.delete().catch(() => {});
    } catch (err) {
      console.error("❌ Transcript error:", err);
      const failText = "⚠️ Failed to generate transcript. Please try again later.";
      if (interaction)
        await interaction.editReply({ content: failText, ephemeral: true }).catch(() => {});
      else await message.reply(failText).catch(() => {});
    }
  },
};
