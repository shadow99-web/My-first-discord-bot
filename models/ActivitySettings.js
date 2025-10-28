const mongoose = require("mongoose");

const ActivitySettingsSchema = new mongoose.Schema({
  botId: { type: String, required: true, unique: true },
  type: { type: String, required: true },
  text: { type: String, required: true },
});

module.exports = mongoose.model("ActivitySettings", ActivitySettingsSchema);
