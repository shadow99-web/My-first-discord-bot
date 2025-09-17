// models/EmojiCache.js
const { Schema, model } = require('mongoose');

const emojiCacheSchema = new Schema({
  keyword: { type: String, required: true, unique: true },
  results: { type: Array, required: true },
  createdAt: { type: Date, default: Date.now, expires: 3600 } // cache expires after 1 hour
});

module.exports = model('EmojiCache', emojiCacheSchema);
