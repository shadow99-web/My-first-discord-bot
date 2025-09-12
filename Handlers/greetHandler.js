const fs = require("fs");
const file = "./greet.json";

// ✅ Ensure file exists
if (!fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify({}, null, 4));
}

// 🔄 Load data
const load = () => {
    try {
        return JSON.parse(fs.readFileSync(file, "utf8") || "{}");
    } catch (e) {
        console.error("Failed to read greet.json:", e);
        return {};
    }
};

// 💾 Save data
const save = (data) => {
    fs.writeFileSync(file, JSON.stringify(data, null, 4));
};

// ➕ Update settings
const setGreet = (guildId, key, value) => {
    const data = load();
    if (!data[guildId]) {
        data[guildId] = {
            enabled: true,
            channel: null,
            welcome: "{mention} Welcome to {server}! 🎉",
            leave: "{user} has left {server}. 👋"
        };
    }
    data[guildId][key] = value;
    save(data);
};

// 🔍 Get settings
const getGreet = (guildId) => {
    const data = load();
    return data[guildId] || null;
};

// 🔀 Replace placeholders
const replacePlaceholders = (template, member) => {
    if (!template) return "";

    return template
        .replace(/{mention}/gi, `<@${member.id}>`)
        .replace(/{user}/gi, `${member.user.username}`)
        .replace(/{tag}/gi, `${member.user.tag}`)
        .replace(/{id}/gi, `${member.id}`)
        .replace(/{server}/gi, member.guild.name)
        .replace(/{membercount}/gi, member.guild.memberCount.toString());
};

module.exports = { load, save, setGreet, getGreet, replacePlaceholders };
