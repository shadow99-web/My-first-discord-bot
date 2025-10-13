const mongoose = require("mongoose");

const rankSettingsSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  enabled: { type: Boolean, default: true }
});

module.exports = mongoose.model("RankSettings", rankSettingsSchema);
