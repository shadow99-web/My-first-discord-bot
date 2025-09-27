// commands/music.js
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("music")
    .setDescription("🎶 Music commands")
    .addSubcommand(sub => sub
      .setName("play")
      .setDescription("Play a song")
      .addStringOption(opt => opt
        .setName("query")
        .setDescription("Song name or URL")
        .setRequired(true)
      )
    )
    .addSubcommand(sub => sub.setName("stop").setDescription("Stop the music")),
    
  async execute({ client, message, interaction, args, isPrefix, safeReply }) {
    try {
      const voiceChannel = isPrefix ? message.member.voice.channel : interaction.member.voice.channel;
      if (!voiceChannel) return isPrefix 
        ? message.reply("❌ Join a voice channel first!") 
        : safeReply({ content: "❌ Join a voice channel first!", ephemeral: true });

      // Determine subcommand
      const sub = isPrefix ? args[0]?.toLowerCase() : interaction.options.getSubcommand();

      switch (sub) {
        case "play": {
          const query = isPrefix ? args.slice(1).join(" ") : interaction.options.getString("query");
          if (!query) return isPrefix 
            ? message.reply("❌ Provide a song name or URL!") 
            : safeReply({ content: "❌ Provide a song name or URL!", ephemeral: true });

          await client.distube.play(voiceChannel, query, {
            member: isPrefix ? message.member : interaction.member,
            textChannel: isPrefix ? message.channel : interaction.channel,
          });

          const embed = new EmbedBuilder()
            .setColor("Blue")
            .setTitle("🎶 Now Playing")
            .setDescription(`▶️ **${query}**`)
            .setFooter({ text: "Control music with the buttons below!" });

          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("music_skip").setEmoji("⏭️").setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId("music_pause").setEmoji("⏸️").setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId("music_resume").setEmoji("▶️").setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId("music_stop").setEmoji("⏹️").setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId("music_queue").setEmoji("🎵").setStyle(ButtonStyle.Secondary)
          );

          if (isPrefix) await message.channel.send({ embeds: [embed], components: [row] });
          else await safeReply({ embeds: [embed], components: [row] });
          break;
        }

        case "stop": {
          const queue = client.distube.getQueue(voiceChannel);
          if (!queue) return isPrefix 
            ? message.reply("❌ Nothing is playing!") 
            : safeReply({ content: "❌ Nothing is playing!", ephemeral: true });

          queue.stop();
          if (isPrefix) message.channel.send("🛑 Music stopped!");
          else safeReply({ content: "🛑 Music stopped!" });
          break;
        }

        default:
          if (isPrefix) message.reply("⚠️ Unknown subcommand. Use `play` or `stop`.");
          else safeReply({ content: "⚠️ Unknown subcommand.", ephemeral: true });
      }
    } catch (err) {
      console.error("❌ Music command error:", err);
      if (isPrefix) message.reply("❌ Something went wrong!");
      else safeReply({ content: "❌ Something went wrong!", ephemeral: true });
    }
  }
};
