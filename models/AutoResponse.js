const { Schema, model } = require("mongoose");

const autoResponseSchema = new Schema({
    guildId: { type: String, required: true },
    trigger: { type: String, required: true }, // single trigger word/phrase
    responses: { type: [String], default: [] }, // multiple possible replies
    author: { type: String } // who added it
}, { timestamps: true });

module.exports = model("AutoResponse", autoResponseSchema);
