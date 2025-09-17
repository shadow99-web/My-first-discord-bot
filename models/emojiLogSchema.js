const mongoose = require("mongoose");

const emojiLogSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    userId: { type: String, required: true },
    emojiName: { type: String, required: true },
    emojiUrl: { type: String, required: true },
    added: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("EmojiLog", emojiLogSchema);
