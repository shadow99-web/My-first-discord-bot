const AutoMod = require("../models/AutoMod");

// ➕ Create or update AutoMod settings
async function setAutoMod(guildId, settings) {
    return await AutoMod.findOneAndUpdate(
        { guildId },
        { $set: settings },
        { upsert: true, new: true }
    );
}

// 🔍 Get AutoMod settings
async function getAutoMod(guildId) {
    return await AutoMod.findOne({ guildId }) || {
        guildId,
        antiLinks: false,
        antiSpam: false,
        badWords: [],
        muteDuration: 5
    };
}

// ➕ Add bad word
async function addBadWord(guildId, word) {
    return await AutoMod.findOneAndUpdate(
        { guildId },
        { $addToSet: { badWords: word.toLowerCase() } },
        { upsert: true, new: true }
    );
}

// ➖ Remove bad word
async function removeBadWord(guildId, word) {
    return await AutoMod.findOneAndUpdate(
        { guildId },
        { $pull: { badWords: word.toLowerCase() } },
        { new: true }
    );
}

module.exports = {
    setAutoMod,
    getAutoMod,
    addBadWord,
    removeBadWord,
};
