const mongoose = require("mongoose");

const vcStatsSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  guildId: { type: String, required: true },
  totalTime: { type: Number, default: 0 }, // in milliseconds
  lastJoin: { type: Number, default: null } // timestamp
});

module.exports = mongoose.model("VCStats", vcStatsSchema);
