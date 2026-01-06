// utils/stickyHelpers.js
const StickyMessage = require("../models/StickyMessage");

async function addSticky({ guildId, channelId, message, authorId }) {
  return StickyMessage.findOneAndUpdate(
    { guildId, channelId },
    { message, authorId },
    { upsert: true, new: true }
  );
}

async function removeSticky({ guildId, channelId }) {
  return StickyMessage.deleteOne({ guildId, channelId });
}

async function getSticky(channelId) {
  return StickyMessage.findOne({ channelId });
}

module.exports = {
  addSticky,
  removeSticky,
  getSticky,
};
