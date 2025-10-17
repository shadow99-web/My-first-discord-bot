const mongoose = require("mongoose");

const reactLockSchema = new mongoose.Schema({
  messageId: { type: String, required: true, unique: true },
  channelId: { type: String, required: true },
  guildId: { type: String, required: true },
  lockedBy: { type: String },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model("ReactLock", reactLockSchema);
