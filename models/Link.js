const mongoose = require("mongoose");

const linkSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  name: { type: String, required: true, unique: true },
  invite: { type: String, required: true },
  createdBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Link", linkSchema);
