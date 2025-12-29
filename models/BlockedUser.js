const mongoose = require("mongoose");

const blockedUserSchema = new mongoose.Schema({
  guildId: {
    type: String,
    required: true,
    index: true,
  },
  userId: {
    type: String,
    required: true,
    index: true,
  },
  command: {
    type: String,
    default: "*", // "*" = all commands
  },
  blockedBy: {
    type: String,
  },
  reason: {
    type: String,
    default: "No reason provided",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("BlockedUser", blockedUserSchema);
