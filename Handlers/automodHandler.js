const fs = require("fs");
const file = "./automod.json";

// ✅ Ensure file exists
if (!fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify({}, null, 4));
}

// 🔄 Load data
const load = () => {
    try {
        return JSON.parse(fs.readFileSync(file, "utf8") || "{}");
    } catch (e) {
        console.error("Failed to read automod.json:", e);
        return {};
    }
};

// 💾 Save data
const save = (data) => {
    fs.writeFileSync(file, JSON.stringify(data, null, 4));
};

// Enable a feature
const enableFeature = (guildId, feature) => {
    const data = load();
    if (!data[guildId]) data[guildId] = { enabled: [], badwords: [], mentionLimit: 5 };
    if (!data[guildId].enabled.includes(feature)) data[guildId].enabled.push(feature);
    save(data);
};

// Disable a feature
const disableFeature = (guildId, feature) => {
    const data = load();
    if (data[guildId]) {
        data[guildId].enabled = data[guildId].enabled.filter(f => f !== feature);
        save(data);
    }
};

// Add banned word
const addBadword = (guildId, word) => {
    const data = load();
    if (!data[guildId]) data[guildId] = { enabled: [], badwords: [], mentionLimit: 5 };
    if (!data[guildId].badwords.includes(word.toLowerCase())) {
        data[guildId].badwords.push(word.toLowerCase());
    }
    save(data);
};

// Remove banned word
const removeBadword = (guildId, word) => {
    const data = load();
    if (data[guildId]) {
        data[guildId].badwords = data[guildId].badwords.filter(w => w !== word.toLowerCase());
        save(data);
    }
};

module.exports = {
    load,
    save,
    enableFeature,
    disableFeature,
    addBadword,
    removeBadword
};
