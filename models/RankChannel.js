const mongoose = require("mongoose");

const rankChannelSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  channelId: { type: String, required: true },
  background: { type: String, default: null }, // ✅ Custom background image URL
});

module.exports = mongoose.model("RankChannel", rankChannelSchema);
