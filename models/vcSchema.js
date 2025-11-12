const mongoose = require("mongoose");

const vcSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  userId: { type: String, required: true },
  channelId: { type: String, required: true },
});

module.exports = mongoose.model("VoiceChannel", vcSchema);
