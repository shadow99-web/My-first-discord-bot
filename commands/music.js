// commands/music.js
const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require("discord.js");

module.exports = {
  name: "music",
  description: "Music commands with subcommands",
  aliases: ["m"],

  slash: new SlashCommandBuilder()
    .setName("music")
    .setDescription("🎶 Music command group")
    .addSubcommand(sub =>
      sub.setName("play")
        .setDescription("Play a song or playlist")
        .addStringOption(opt =>
          opt.setName("query")
            .setDescription("Song name or URL")
            .setRequired(true)
        )
    ),

  async execute(client, message, args) {
    if (!args[0]) return message.reply("⚠️ Use: `!music play <song>`");

    const query = args.slice(1).join(" ");
    if (!query) return message.reply("⚠️ Provide a song name or URL!");

    if (!message.member.voice.channel) {
      return message.reply("❌ You need to join a voice channel first!");
    }

    try {
      await client.distube.play(message.member.voice.channel, query, {
        member: message.member,
        textChannel: message.channel,
        message,
      });

      // 🎶 Embed
      const embed = new EmbedBuilder()
        .setColor("Blue")
        .setTitle("🎶 Now Playing")
        .setDescription(`▶️ **${query}**`)
        .setFooter({ text: "Control music with the buttons below!" });

      // 🎛️ Buttons
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("music_skip").setEmoji("⏭️").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("music_pause").setEmoji("⏸️").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("music_resume").setEmoji("▶️").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId("music_stop").setEmoji("⏹️").setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId("music_queue").setEmoji("🎵").setStyle(ButtonStyle.Secondary),
      );

      await message.channel.send({ embeds: [embed], components: [row] });
    } catch (e) {
      console.error(e);
      message.reply("❌ Error: " + e.message);
    }
  },

  async executeSlash(client, interaction) {
    const query = interaction.options.getString("query");
    if (!interaction.member.voice.channel) {
      return interaction.reply({ content: "❌ Join a voice channel first!", ephemeral: true });
    }

    try {
      await client.distube.play(interaction.member.voice.channel, query, {
        member: interaction.member,
        textChannel: interaction.channel,
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
        new ButtonBuilder().setCustomId("music_queue").setEmoji("🎵").setStyle(ButtonStyle.Secondary),
      );

      await interaction.reply({ embeds: [embed], components: [row] });
    } catch (e) {
      console.error(e);
      interaction.reply("❌ Error: " + e.message);
    }
  }
};
