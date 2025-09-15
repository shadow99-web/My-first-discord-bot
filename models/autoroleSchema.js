// Models/autoroleSchema.js
const mongoose = require("mongoose");

const autoroleSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    humans: { type: [String], default: [] }, // role IDs
    bots: { type: [String], default: [] }    // role IDs
});

module.exports = mongoose.model("Autorole", autoroleSchema);
