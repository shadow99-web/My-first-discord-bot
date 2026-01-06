// models/StickyMessage.js
const mongoose = require("mongoose");

const StickySchema = new mongoose.Schema({
  guildId: String,
  channelId: String,
  message: String,
  authorId: String,

  // 👇 REQUIRED for repost system
  lastMessageId: {
    type: String,
    default: null,
  },
});

module.exports = mongoose.model("StickyMessage", StickySchema);
