// Handlers/greetHandler.js
const Greet = require("../models/Greet");

// ➕ Add or update greet message
async function addGreet(guildId, greetData) {
    return await Greet.findOneAndUpdate(
        { guildId },
        { $set: { greet: greetData } },
        { upsert: true, new: true }
    );
}

// ➖ Remove greet message
async function removeGreet(guildId) {
    const res = await Greet.deleteOne({ guildId });
    return res.deletedCount > 0;
}

// 🔍 Get greet message
async function getGreet(guildId) {
    const doc = await Greet.findOne({ guildId });
    return doc?.greet || null;
}

// ➕ Set greet channel
async function setChannel(guildId, channelId) {
    return await Greet.findOneAndUpdate(
        { guildId },
        { $set: { channel: channelId } },
        { upsert: true, new: true }
    );
}

// 🔍 Get greet channel
async function getChannel(guildId) {
    const doc = await Greet.findOne({ guildId });
    return doc?.channel || null;
}

module.exports = {
    addGreet,
    removeGreet,
    getGreet,
    setChannel,
    getChannel,
};
