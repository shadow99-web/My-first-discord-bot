const mongoose = require("mongoose");

const FacebookFeedSchema = new mongoose.Schema({
  guildId: String,
  pageId: String,
  channelId: String,
  lastPostId: String
});

module.exports = mongoose.model("FacebookFeed", FacebookFeedSchema);
