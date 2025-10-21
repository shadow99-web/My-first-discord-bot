const mongoose = require("mongoose");

const AntiNukeSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  enabled: { type: Boolean, default: false },
  // action: 'ban' or 'demote' (removes dangerous perms / roles)
  action: { type: String, enum: ["ban","demote"], default: "ban" },
  // small whitelist (owner and these users/roles won't be punished)
  exemptUsers: { type: [String], default: [] },
  exemptRoles: { type: [String], default: [] },
  // last incidents cache for simple rate-limiting (not persisted)
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("AntiNuke", AntiNukeSchema);
