// Handlers/greetHandler.js
const fs = require("fs");
const path = require("path");

// ✅ Always resolve greet.json in project root
const file = path.resolve(__dirname, "..", "greet.json");

// Ensure file exists
function ensure() {
    if (!fs.existsSync(file)) {
        fs.writeFileSync(file, JSON.stringify({}, null, 4));
    }
}

// 🔄 Load data safely
const load = () => {
    try {
        ensure();
        const raw = fs.readFileSync(file, "utf8");
        return raw ? JSON.parse(raw) : {};
    } catch (e) {
        console.error("❌ Failed to read greet.json:", e);
        return {};
    }
};

// 💾 Save data safely (atomic write)
const save = (data) => {
    try {
        ensure();
        const tmp = file + ".tmp";
        fs.writeFileSync(tmp, JSON.stringify(data, null, 4));
        fs.renameSync(tmp, file);
    } catch (e) {
        console.error("❌ Failed to save greet.json:", e);
    }
};

// ➕ Add or update greet
const addGreet = (guildId, greetData) => {
    const db = load();
    db[guildId] = greetData;
    save(db);
};

// ➖ Remove greet
const removeGreet = (guildId) => {
    const db = load();
    if (db[guildId]) {
        delete db[guildId];
        save(db);
        return true;
    }
    return false;
};

// 🔍 Get greet data
const getGreet = (guildId) => {
    const db = load();
    return db[guildId] || null;
};

// 🔍 Get greet channel
const getChannel = (guildId) => {
    const db = load();
    return db[guildId]?.channel || null;
};

module.exports = {
    load,
    save,
    addGreet,
    removeGreet,
    getGreet,
    getChannel,
};
