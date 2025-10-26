const mongoose = require("mongoose");

const WelcomeSettingsSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  channelId: { type: String, required: true },
  background: { type: String, default: null },
});

module.exports = mongoose.model("WelcomeSettings", WelcomeSettingsSchema);
