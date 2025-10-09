// models/Giveaway.js
const mongoose = require("mongoose");

const giveawaySchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  channelId: { type: String, required: true },
  messageId: { type: String }, // filled after message is sent
  hostId: { type: String, required: true },
  prize: { type: String, required: true },
  winnersCount: { type: Number, default: 1 },
  endAt: { type: Date, required: true },
  participants: { type: [String], default: [] },
  ended: { type: Boolean, default: false },
  winners: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.models.Giveaway || mongoose.model("Giveaway", giveawaySchema);
