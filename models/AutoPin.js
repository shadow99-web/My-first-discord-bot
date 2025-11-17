const mongoose = require("mongoose");

const AutoPinSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  taskId: { type: Number, required: true }, // NEW
  channelId: { type: String, required: true },
  query: { type: String, required: true },
  interval: { type: Number, required: true },
  lastPost: { type: Number, default: 0 },
  lastImage: { type: String, default: "" }, 
});

module.exports = mongoose.model("AutoPin", AutoPinSchema);
