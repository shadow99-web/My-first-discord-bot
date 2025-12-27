const mongoose = require("mongoose");

const fbFeedSchema = new mongoose.Schema({
  guildId: String,
  channelId: String,
  rssUrl: String,
  lastPostId: String
});

module.exports = mongoose.model("FacebookFeed", fbFeedSchema);
