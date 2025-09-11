// Handlers/autoresponseHandler.js
const fs = require("fs");
const file = "./autoresponse.json";

// ✅ Ensure file exists
if (!fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify({}, null, 4));
}

// 🔄 Load data
const load = () => {
    try {
        return JSON.parse(fs.readFileSync(file, "utf8") || "{}");
    } catch (e) {
        console.error("Failed to read autoresponse.json:", e);
        return {};
    }
};

// 💾 Save data
const save = (data) => {
    fs.writeFileSync(file, JSON.stringify(data, null, 4));
};

// ➕ Add response
const addResponse = (guildId, trigger, response) => {
    const data = load();
    if (!data[guildId]) data[guildId] = {};

    // Store trigger as lowercase for safety
    const key = trigger.toLowerCase();
    data[guildId][key] = response;

    save(data);
};

// ➖ Remove response
const removeResponse = (guildId, trigger) => {
    const data = load();
    const key = trigger.toLowerCase();
    if (data[guildId] && data[guildId][key]) {
        delete data[guildId][key];
        save(data);
        return true;
    }
    return false;
};

// 🔍 Get response (case-insensitive)
const getResponse = (guildId, messageContent) => {
    const data = load();
    if (!data[guildId]) return null;

    const key = messageContent.toLowerCase();
    return data[guildId][key] || null;
};

module.exports = {
    addResponse,
    removeResponse,
    getResponse,
};
