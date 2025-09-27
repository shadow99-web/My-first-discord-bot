// commands/music.js
const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require("discord.js");

module.exports = {
  name: "music",
  description: "Music commands with subcommands",
  aliases: ["m"],

  // === Slash Command Builder ===
  data: new SlashCommandBuilder()
    .setName("music")
    .setDescription("🎶 Music commands")
    .addSubcommand(sub => sub.setName("play").setDescription("Play a song").addStringOption(opt => opt.setName("query").setDescription("Song name or URL").setRequired(true)))
    .addSubcommand(sub => sub.setName("stop").setDescription("Stop the music"))
    .addSubcommand(sub => sub.setName("skip").setDescription("Skip the current song"))
    .addSubcommand(sub => sub.setName("pause").setDescription("Pause the song"))
    .addSubcommand(sub => sub.setName("resume").setDescription("Resume the song"))
    .addSubcommand(sub => sub.setName("queue").setDescription("Show the queue")),

  // === Prefix Command Executor ===
  async executePrefix(client, message, args) {
    if (!args[0]) return message.reply("⚠️ Usage: `!music <play|stop|skip|pause|resume|queue>`");

    const sub = args[0].toLowerCase();
    const query = args.slice(1).join(" ");

    if (!message.member.voice.channel && ["play", "stop", "skip", "pause", "resume"].includes(sub))
      return message.reply("❌ Join a voice channel first!");

    const queue = client.distube.getQueue(message.guildId);

    try {
      switch (sub) {
        case "play":
          if (!query) return message.reply("❌ Provide a song name or URL!");
          await client.distube.play(message.member.voice.channel, query, { member: message.member, textChannel: message.channel });
          message.reply(`🎶 Playing **${query}**`);
          break;

        case "stop":
          if (!queue) return message.reply("❌ No music is playing!");
          queue.stop();
          message.reply("⏹️ Music stopped.");
          break;

        case "skip":
          if (!queue) return message.reply("❌ No music is playing!");
          queue.skip();
          message.reply("⏭️ Song skipped.");
          break;

        case "pause":
          if (!queue) return message.reply("❌ No music is playing!");
          queue.pause();
          message.reply("⏸️ Music paused.");
          break;

        case "resume":
          if (!queue) return message.reply("❌ No music is playing!");
          queue.resume();
          message.reply("▶️ Music resumed.");
          break;

        case "queue":
          if (!queue) return message.reply("❌ No music is playing!");
          const songs = queue.songs.map((s, i) => `${i + 1}. ${s.name} - \`${s.formattedDuration}\``).join("\n");
          message.reply({ embeds: [new EmbedBuilder().setTitle("🎵 Queue").setDescription(songs).setColor("Blue")] });
          break;

        default:
          message.reply("❌ Unknown subcommand.");
      }
    } catch (e) {
      console.error(e);
      message.reply("❌ Error: " + e.message);
    }
  },

  // === Slash Command Executor ===
  async executeSlash(client, interaction) {
    const sub = interaction.options.getSubcommand();
    const query = interaction.options.getString("query");
    const queue = client.distube.getQueue(interaction.guildId);

    if (!interaction.member.voice.channel && ["play", "stop", "skip", "pause", "resume"].includes(sub))
      return interaction.reply({ content: "❌ Join a voice channel first!", ephemeral: true });

    try {
      switch (sub) {
        case "play":
          await client.distube.play(interaction.member.voice.channel, query, { member: interaction.member, textChannel: interaction.channel });
          interaction.reply({ content: `🎶 Playing **${query}**` });
          break;

        case "stop":
          if (!queue) return interaction.reply({ content: "❌ No music is playing!", ephemeral: true });
          queue.stop();
          interaction.reply("⏹️ Music stopped.");
          break;

        case "skip":
          if (!queue) return interaction.reply({ content: "❌ No music is playing!", ephemeral: true });
          queue.skip();
          interaction.reply("⏭️ Song skipped.");
          break;

        case "pause":
          if (!queue) return interaction.reply({ content: "❌ No music is playing!", ephemeral: true });
          queue.pause();
          interaction.reply("⏸️ Music paused.");
          break;

        case "resume":
          if (!queue) return interaction.reply({ content: "❌ No music is playing!", ephemeral: true });
          queue.resume();
          interaction.reply("▶️ Music resumed.");
          break;

        case "queue":
          if (!queue) return interaction.reply({ content: "❌ No music is playing!", ephemeral: true });
          const songs = queue.songs.map((s, i) => `${i + 1}. ${s.name} - \`${s.formattedDuration}\``).join("\n");
          interaction.reply({ embeds: [new EmbedBuilder().setTitle("🎵 Queue").setDescription(songs).setColor("Blue")] });
          break;
      }
    } catch (e) {
      console.error(e);
      interaction.reply({ content: "❌ Error: " + e.message, ephemeral: true });
    }
  }
};
