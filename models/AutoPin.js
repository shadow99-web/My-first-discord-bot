const mongoose = require("mongoose");

const AutoPinSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  taskId: { type: Number, required: true },
  channelId: { type: String, required: true },
  query: { type: String, required: true },
  interval: { type: Number, required: true },
  lastPost: { type: Number, default: 0 },

  // NEW: store *multiple* previous images
  postedImages: { type: [String], default: [] },

  // NEW: maximum number of stored images
  maxHistory: { type: Number, default: 200 }, 
});

module.exports = mongoose.model("AutoPin", AutoPinSchema);
