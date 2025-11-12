const { EmbedBuilder } = require("discord.js");
const VoiceChannel = require("../models/vcSchema");

module.exports = async (oldState, newState) => {
  if (!oldState.channelId || oldState.channelId === newState.channelId) return;
  const guild = oldState.guild;
  const channel = oldState.channel;
  if (!channel) return;

  const vcData = await VoiceChannel.findOne({ guildId: guild.id, channelId: channel.id });
  if (!vcData) return;

  if (channel.members.size === 0) {
    try {
      await channel.delete();
      await VoiceChannel.deleteOne({ _id: vcData._id });

      const logChannel = guild.channels.cache.find(c => c.name === "vc-logs");
      if (logChannel) {
        const embed = new EmbedBuilder()
          .setColor("#2b2d31")
          .setTitle(`<a:blue_heart:1414309560231002194> SHADOW VC Auto-Deleted`)
          .setDescription(`💨 <@${vcData.userId}>'s VC was auto-deleted because it became empty.`)
          .setTimestamp();
        logChannel.send({ embeds: [embed] });
      }
    } catch (err) {
      console.error("VC Auto-delete error:", err);
    }
  }
};
