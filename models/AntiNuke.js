const mongoose = require("mongoose");

const AntiNukeSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },

  // Whether Anti-Nuke is active
  enabled: { type: Boolean, default: false },

  // What action to take if anyone except the owner tries a nuke-like action
  action: {
    type: String,
    enum: ["ban", "demote"],
    default: "ban",
  },

  // Always keep a last modified timestamp for logs or diagnostics
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true }); // auto adds createdAt and updatedAt
module.exports = mongoose.model("AntiNuke", AntiNukeSchema);
