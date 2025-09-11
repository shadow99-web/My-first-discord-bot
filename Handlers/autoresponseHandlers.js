const fs = require("fs");
const file = "./autoresponses.json";

if (!fs.existsSync(file)) fs.writeFileSync(file, "{}");

function getAutoresponses() {
    try {
        return JSON.parse(fs.readFileSync(file, "utf8") || "{}");
    } catch (e) {
        console.error("Failed to read autoresponses.json:", e);
        return {};
    }
}

function saveAutoresponses(data) {
    fs.writeFileSync(file, JSON.stringify(data, null, 4));
}

function addAutoresponse(guildId, trigger, text = "", attachments = []) {
    const data = getAutoresponses();
    if (!data[guildId]) data[guildId] = {};

    data[guildId][trigger.toLowerCase()] = { text, attachments };
    saveAutoresponses(data);
}

function removeAutoresponse(guildId, trigger) {
    const data = getAutoresponses();
    if (data[guildId] && data[guildId][trigger.toLowerCase()]) {
        delete data[guildId][trigger.toLowerCase()];
        saveAutoresponses(data);
        return true;
    }
    return false;
}

function listAutoresponses(guildId) {
    const data = getAutoresponses();
    return data[guildId] || {};
}

function getResponse(guildId, trigger) {
    const data = getAutoresponses();
    return data[guildId]?.[trigger.toLowerCase()] || null;
}

module.exports = {
    getAutoresponses,
    saveAutoresponses,
    addAutoresponse,
    removeAutoresponse,
    listAutoresponses,
    getResponse
};
