const mongoose = require("mongoose");

const FacebookFeedSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  channelId: { type: String, required: true },
  rssUrl: { type: String, required: true },
  lastPostLink: { type: String, default: null }
});

module.exports = mongoose.model("FacebookFeed", FacebookFeedSchema);
