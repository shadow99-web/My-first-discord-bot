// Handlers/autoModHandler.js
const AutoMod = require("../Models/autoModSchema"); // ✅ Your mongoose schema

// --- Save or update AutoMod settings ---
async function setAutoMod(guildId, updates) {
    let doc = await AutoMod.findOne({ guildId });
    if (!doc) {
        doc = new AutoMod({ guildId });
    }

    // Apply updates (toggle features, mute duration, etc.)
    for (const key of Object.keys(updates)) {
        doc[key] = updates[key];
    }

    await doc.save();
    return doc;
}

// --- Fetch AutoMod settings (default if none exists) ---
async function getAutoMod(guildId) {
    let doc = await AutoMod.findOne({ guildId });
    if (!doc) {
        doc = new AutoMod({
            guildId,
            antiLinks: false,
            antiSpam: false,
            muteDuration: 5,
            badWords: []
        });
        await doc.save();
    }
    return doc;
}

// --- Add a bad word ---
async function addBadWord(guildId, word) {
    const doc = await getAutoMod(guildId);

    if (!doc.badWords.includes(word.toLowerCase())) {
        doc.badWords.push(word.toLowerCase());
        await doc.save();
    }

    return doc;
}

// --- Remove a bad word ---
async function removeBadWord(guildId, word) {
    const doc = await getAutoMod(guildId);

    doc.badWords = doc.badWords.filter(w => w !== word.toLowerCase());
    await doc.save();

    return doc;
}

module.exports = {
    setAutoMod,
    getAutoMod,
    addBadWord,
    removeBadWord,
};
