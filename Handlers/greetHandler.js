// Handlers/greetHandler.js
const fs = require("fs");
const path = require("path");

const file = path.join(__dirname, "../Data/greet.json");

function load() {
    if (!fs.existsSync(file)) return {};
    try {
        return JSON.parse(fs.readFileSync(file, "utf8"));
    } catch (e) {
        console.error("Failed to load greet.json:", e);
        return {};
    }
}

function save(data) {
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
