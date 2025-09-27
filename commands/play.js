const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  name: "play",
  description: "Play a song in your voice channel",
  aliases: ["p"], // prefix version: !play or !p
  data: new SlashCommandBuilder()
    .setName("play")
    .setDescription("Play a song in your voice channel")
    .addStringOption(option =>
      option.setName("query")
        .setDescription("Song name or URL")
        .setRequired(true)
    ),

  async execute({ client, interaction, message, args, isPrefix }) {
    try {
      // Get query
      const query = isPrefix
        ? args.join(" ")
        : interaction.options.getString("query");

      if (!query) {
        const msg = "❌ Please provide a song name or URL!";
        if (isPrefix) return message.reply(msg);
        return interaction.reply({ content: msg, ephemeral: true });
      }

      // Get voice channel
      const voiceChannel = isPrefix
        ? message.member.voice.channel
        : interaction.member.voice.channel;

      if (!voiceChannel) {
        const msg = "❌ You must be in a voice channel to play music!";
        if (isPrefix) return message.reply(msg);
        return interaction.reply({ content: msg, ephemeral: true });
      }

      // Play music
      await client.distube.play(voiceChannel, query, {
        member: isPrefix ? message.member : interaction.member,
        textChannel: isPrefix ? message.channel : interaction.channel,
      });

      const embed = new EmbedBuilder()
        .setColor("Random")
        .setTitle("🎶 Music Player")
        .setDescription(`🎵 Added to queue: **${query}**`)
        .setThumbnail(client.user.displayAvatarURL())
        .setFooter({ text: `Requested by ${isPrefix ? message.author.tag : interaction.user.tag}` })
        .setTimestamp();

      if (isPrefix) {
        await message.channel.send({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed] });
      }
    } catch (err) {
      console.error("❌ Music command error:", err);
      if (isPrefix) {
        message.reply("⚠️ Something went wrong while playing music!");
      } else {
        interaction.reply({ content: "⚠️ Something went wrong!", ephemeral: true });
      }
    }
  },
};
