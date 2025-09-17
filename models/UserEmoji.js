// models/UserEmoji.js
const { Schema, model } = require('mongoose');

const userEmojiSchema = new Schema({
  userId: { type: String, required: true },
  guildId: { type: String, required: true },
  emojiName: { type: String, required: true },
  emojiUrl: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = model('UserEmoji', userEmojiSchema);
