const mongoose = require("mongoose");

const MemberStatsSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  date: { type: String, required: true }, // YYYY-MM-DD
  joins: { type: Number, default: 0 },
  leaves: { type: Number, default: 0 },
});

module.exports = mongoose.model("MemberStats", MemberStatsSchema);
