const { Schema, model } = require("mongoose");

const autoResponseSchema = new Schema({
    guildId: { type: String, required: true },
    triggers: { type: [String], required: true }, // list of trigger words/phrases
    response: { type: String, required: true },   // reply text
    author: { type: String },                     // who added it
}, { timestamps: true });

module.exports = model("AutoResponse", autoResponseSchema);
