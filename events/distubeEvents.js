module.exports = (client) => {
  client.distube
    .on("playSong", (queue, song) => {
      queue.textChannel.send(`🎶 Now Playing: **${song.name}** - \`${song.formattedDuration}\``);
    })
    .on("addSong", (queue, song) => {
      queue.textChannel.send(`➕ Added: **${song.name}** - \`${song.formattedDuration}\``);
    })
    .on("error", (channel, e) => {
      if (channel) channel.send("❌ Error: " + e.toString().slice(0, 1974));
      else console.error(e);
    });
};
