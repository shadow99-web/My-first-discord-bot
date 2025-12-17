const mongoose = require("mongoose");

const noPrefixSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  enabled: { type: Boolean, default: false },
});

module.exports = mongoose.model("NoPrefix", noPrefixSchema);
