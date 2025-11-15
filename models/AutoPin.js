const mongoose = require("mongoose");

const AutoPinSchema = new mongoose.Schema({
  guildId: String,
  channelId: String,
  query: String,
  interval: Number, // in ms
  lastPost: Number,
});

module.exports = mongoose.model("AutoPin", AutoPinSchema);
