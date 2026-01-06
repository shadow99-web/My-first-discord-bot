const mongoose = require("mongoose");

const stickySchema = new mongoose.Schema({
  guildId: String,
  channelId: String,
  message: String,
  authorId: String,
});

module.exports = mongoose.model("StickyMessage", stickySchema);
