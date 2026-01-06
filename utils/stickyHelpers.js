// utils/stickyHelpers.js
const StickyMessage = require("../models/StickyMessage");

/**
 * Add or update sticky for a channel
 */
async function addSticky({ guildId, channelId, message, authorId }) {
  return StickyMessage.findOneAndUpdate(
    { guildId, channelId },
    {
      guildId,
      channelId,
      message,
      authorId,
      lastMessageId: null, // 🔥 IMPORTANT: reset old sticky
    },
    { upsert: true, new: true }
  );
}

/**
 * Remove sticky from a channel
 */
async function removeSticky({ guildId, channelId }) {
  return StickyMessage.findOneAndDelete({ guildId, channelId });
}

/**
 * Get sticky for a channel
 */
async function getSticky(channelId) {
  return StickyMessage.findOne({ channelId });
}

/**
 * List all stickies in a guild
 */
async function listStickies(guildId) {
  return StickyMessage.find({ guildId });
}

module.exports = {
  addSticky,
  removeSticky,
  getSticky,
  listStickies,
};
