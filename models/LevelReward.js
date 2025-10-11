const mongoose = require("mongoose");

const LevelRewardSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  level: { type: Number, required: true },
  roleId: { type: String, required: true },
});

module.exports = mongoose.model("LevelReward", LevelRewardSchema);
