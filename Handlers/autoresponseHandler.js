// Handlers/autoresponseHandler.js
const fs = require("fs");
const path = require("path");

// Always resolve to the project root, not relative
const file = path.resolve(__dirname, "..", "autoresponse.json");

// ✅ Ensure file exists
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
        console.error("❌ Failed to read autoresponse.json:", e);
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
        console.error("❌ Failed to save autoresponse.json:", e);
    }
};

// ➕ Add response
const addResponse = (guildId, trigger, response) => {
    const data = load();
    if (!data[guildId]) data[guildId] = {};

    const key = trigger.toLowerCase();
    if (!data[guildId][key]) data[guildId][key] = [];

    if (!Array.isArray(data[guildId][key])) {
        data[guildId][key] = [data[guildId][key]];
    }

    data[guildId][key].push(response);
    save(data);
};

// ➖ Remove response
const removeResponse = (guildId, trigger) => {
    const data = load();
    const key = trigger.toLowerCase();
    if (data[guildId]?.[key]) {
        delete data[guildId][key];
        save(data);
        return true;
    }
    return false;
};

// 🔍 Get response
const getResponse = (guildId, messageContent) => {
    const data = load();
    if (!data[guildId]) return null;

    const msg = messageContent.toLowerCase();
    for (const [trigger, responses] of Object.entries(data[guildId])) {
        if (msg.includes(trigger)) {
            const resList = Array.isArray(responses) ? responses : [responses];
            return resList[Math.floor(Math.random() * resList.length)];
        }
    }
    return null;
};

// 📜 List all
const listResponses = (guildId) => {
    const data = load();
    return data[guildId] || {};
};

module.exports = {
    addResponse,
    removeResponse,
    getResponse,
    listResponses,
    load,
};
