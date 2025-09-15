const mongoose = require("mongoose");

const autoModSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    antiLinks: { type: Boolean, default: false },
    antiSpam: { type: Boolean, default: false },
    badWords: { type: [String], default: [] },
    muteDuration: { type: Number, default: 5 } // in minutes
});

module.exports = mongoose.model("AutoMod", autoModSchema);
