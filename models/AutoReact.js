const mongoose = require("mongoose");

const AutoReactSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  // store triggers as array of { word: string, emoji: string }
  triggers: [
    {
      word: { type: String, required: true }, // saved lowercase
      emoji: { type: String, required: true }, // raw emoji input from user
      createdAt: { type: Date, default: Date.now },
      createdBy: { type: String } // user id
    }
  ],
}, { timestamps: true });

module.exports = mongoose.models.AutoReact || mongoose.model("AutoReact", AutoReactSchema);
