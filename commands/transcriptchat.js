const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
} = require("discord.js");
const discordTranscripts = require("discord-html-transcripts");

module.exports = {
  name: "transcriptchat",
  description: " Save chat messages as an HTML transcript file.",
  usage: "transcriptchat [#channel]",
  options: [
    {
      name: "channel",
      description: "The channel to save the transcript from",
      type: 7, // CHANNEL
      required: false,
    },
  ],

  // ✅ Slash Command Definition
  data: new SlashCommandBuilder()
    .setName("transcriptchat")
    .setDescription(" Save chat messages as an HTML transcript file.")
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("Select a channel to generate transcript")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  // ✅ Slash Command Handler
  async execute({ interaction, message, args, isPrefix }) {
    try {
      const targetChannel =
        (interaction && interaction.options.getChannel("channel")) ||
        (isPrefix && message.mentions.channels.first()) ||
        (isPrefix && args.length
          ? message.guild.channels.cache.get(args[0].replace(/[<#>]/g, ""))
          : null) ||
        (interaction ? interaction.channel : message.channel);

      if (!targetChannel || targetChannel.type !== ChannelType.GuildText) {
        const replyContent = "⚠️ Please select a valid text channel.";
        if (interaction) return interaction.reply({ content: replyContent, ephemeral: true });
        else return message.reply(replyContent);
      }

      // Inform user
      if (interaction)
        await interaction.reply({
          content: `🕐 Generating transcript for ${targetChannel}...`,
          ephemeral: true,
        });
      else
        await message.reply(`🕐 Generating transcript for ${targetChannel}...`);

      // ✅ Generate HTML transcript
      const attachment = await discordTranscripts.createTranscript(targetChannel, {
        limit: -1, // fetch all
        returnBuffer: false,
        fileName: `${targetChannel.name}-transcript.html`,
        saveImages: true,
      });

      // ✅ Send transcript file
      const replyData = {
        content: `✅ Transcript generated for ${targetChannel}!`,
        files: [attachment],
      };

      if (interaction) await interaction.followUp(replyData);
      else await message.channel.send(replyData);
    } catch (err) {
      console.error("❌ Transcript Error:", err);
      const errorMsg = "⚠️ Failed to generate transcript. Try again later.";
      if (interaction && !interaction.replied)
        await interaction.reply({ content: errorMsg, ephemeral: true });
      else if (message)
        await message.reply(errorMsg);
    }
  },
};
