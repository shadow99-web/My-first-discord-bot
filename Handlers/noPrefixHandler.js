const NoPrefix = require("../models/NoPrefix");

// Enable or disable
async function setNoPrefix(guildId, state) {
  return await NoPrefix.findOneAndUpdate(
    { guildId },
    { $set: { enabled: state } },
    { upsert: true, new: true }
  );
}

// Get status
async function getNoPrefix(guildId) {
  const doc = await NoPrefix.findOne({ guildId });
  return doc?.enabled || false;
}

module.exports = {
  setNoPrefix,
  getNoPrefix,
};
