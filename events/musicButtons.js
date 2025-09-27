// events/musicButtons.js
module.exports = (client) => {
  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isButton()) return;
    const { distube } = client;

    if (!interaction.member.voice.channel) {
      return interaction.reply({ content: "❌ Join a voice channel first!", ephemeral: true });
    }

    try {
      switch (interaction.customId) {
        case "music_skip":
          await distube.skip(interaction);
          return interaction.reply({ content: "⏭️ Skipped!", ephemeral: true });

        case "music_pause":
          distube.pause(interaction);
          return interaction.reply({ content: "⏸️ Paused.", ephemeral: true });

        case "music_resume":
          distube.resume(interaction);
          return interaction.reply({ content: "▶️ Resumed.", ephemeral: true });

        case "music_stop":
          distube.stop(interaction);
          return interaction.reply({ content: "⏹️ Stopped.", ephemeral: true });

        case "music_queue":
          const queue = distube.getQueue(interaction);
          if (!queue) return interaction.reply({ content: "⚠️ Nothing is playing.", ephemeral: true });
          return interaction.reply({
            content: "🎵 **Queue:**\n" + queue.songs.map((s, i) => `${i === 0 ? "▶️" : `${i}.`} ${s.name}`).join("\n"),
            ephemeral: true
          });
      }
    } catch (e) {
      console.error(e);
      interaction.reply({ content: "❌ Error: " + e.message, ephemeral: true });
    }
  });
};
