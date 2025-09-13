// Handlers/autoresponseHandler.js
const fs = require("fs");
const file = "./autoresponse.json";

// ✅ Ensure file exists
if (!fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify({}, null, 4));
}

// 🔄 Load data safely
const load = () => {
    try {
        return JSON.parse(fs.readFileSync(file, "utf8") || "{}");
    } catch (e) {
        console.error("❌ Failed to read autoresponse.json:", e);
        return {};
    }
};

// 💾 Save data safely
const save = (data) => {
    try {
        fs.writeFileSync(file, JSON.stringify(data, null, 4));
    } catch (e) {
        console.error("❌ Failed to save autoresponse.json:", e);
    }
};

// ➕ Add response
const addResponse = (guildId, trigger, response) => {
    const data = load();
    if (!data[guildId]) data[guildId] = {};

    const key = trigger.toLowerCase();

    // Optional: if you want multiple responses, store array instead of string
    if (!data[guildId][key]) {
        data[guildId][key] = [];
    }
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

// 🔍 Get response (case-insensitive, supports partial match)
const getResponse = (guildId, messageContent) => {
    const data = load();
    if (!data[guildId]) return null;

    const msg = messageContent.toLowerCase();
    for (const [trigger, responses] of Object.entries(data[guildId])) {
        if (msg.includes(trigger)) {
            const resList = Array.isArray(responses) ? responses : [responses];
            // Randomize if multiple responses exist
            return resList[Math.floor(Math.random() * resList.length)];
        }
    }
    return null;
};

// 📜 List all responses for a guild
const listResponses = (guildId) => {
    const data = load();
    return data[guildId] || {};
};

module.exports = {
    addResponse,
    removeResponse,
    getResponse,
    listResponses,
    load
};
