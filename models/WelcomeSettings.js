const mongoose = require("mongoose");

const WelcomeSettingsSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  channelId: { type: String, required: true },
  background: {
    type: String,
    default: "https://i.imgur.com/3ZUrjUP.jpeg", // default background URL
  },
});

module.exports = mongoose.model("WelcomeSettings", WelcomeSettingsSchema);
