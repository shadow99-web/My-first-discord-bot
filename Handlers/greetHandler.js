// Handlers/greetHandler.js
const fs = require("fs");
const file = "./greet.json";

// ✅ Ensure file exists
if (!fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify({}, null, 4));
}

// 🔄 Load greets
const load = () => {
    try {
        return JSON.parse(fs.readFileSync(file, "utf8") || "{}");
    } catch (e) {
        console.error("Failed to read greet.json:", e);
        return {};
    }
};

// 💾 Save greets
const save = (data) => {
    fs.writeFileSync(file, JSON.stringify(data, null, 4));
};

// ➕ Add/replace greet (only one per guild)
const addGreet = (guildId, greet) => {
    const data = load();
    data[guildId] = greet; // overwrite if exists
    save(data);
};

// ➖ Remove greet
const removeGreet = (guildId) => {
    const data = load();
    if (data[guildId]) {
        delete data[guildId];
        save(data);
        return true;
    }
    return false;
};

// 🔍 Get greet
const getGreet = (guildId) => {
    const data = load();
    return data[guildId] || null;
};

module.exports = {
    addGreet,
    removeGreet,
    getGreet,
    load
};
