// Handlers/greetHandler.js
const fs = require("fs");
const path = require("path");

const file = path.join(__dirname, "../greet.json");

function load() {
    if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify({}));
    return JSON.parse(fs.readFileSync(file));
}

function save(data) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function addGreet(guildId, greetData) {
    const db = load();
    if (!db[guildId]) db[guildId] = [];
    db[guildId].push(greetData);
    save(db);
}

function removeGreet(guildId, index) {
    const db = load();
    if (!db[guildId]) return false;
    if (index < 0 || index >= db[guildId].length) return false;
    db[guildId].splice(index, 1);
    save(db);
    return true;
}

module.exports = { load, addGreet, removeGreet };
