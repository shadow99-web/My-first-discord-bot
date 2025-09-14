// Handlers/greetHandler.js
const fs = require("fs");
const path = require("path");

// greet.json will be created in project root (same place as index.js)
const file = path.join(process.cwd(), "greet.json");

function ensureFile() {
    if (!fs.existsSync(file)) {
        fs.writeFileSync(file, JSON.stringify({}, null, 2));
    }
}

function load() {
    ensureFile();
    try {
        return JSON.parse(fs.readFileSync(file, "utf8"));
    } catch (e) {
        console.error("Failed to load greet.json:", e);
        return {};
    }
}

function save(data) {
    ensureFile();
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function addGreet(guildId, greetData) {
    const db = load();
    if (!db[guildId]) db[guildId] = {};
    db[guildId].greet = greetData;
    save(db);
    return true;
}

function removeGreet(guildId) {
    const db = load();
    if (db[guildId] && db[guildId].greet) {
        delete db[guildId].greet;
        save(db);
        return true;
    }
    return false;
}

function setChannel(guildId, channelId) {
    const db = load();
    if (!db[guildId]) db[guildId] = {};
    db[guildId].channel = channelId;
    save(db);
    return true;
}

function getChannel(guildId) {
    const db = load();
    return db[guildId]?.channel || null;
}

module.exports = {
    load,
    addGreet,
    removeGreet,
    setChannel,
    getChannel
};
