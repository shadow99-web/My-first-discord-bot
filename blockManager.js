// utils/blockManager.js
const fs = require("fs");
const blockFile = "./block.json";

// Create file if it doesn't exist
if (!fs.existsSync(blockFile)) fs.writeFileSync(blockFile, "{}");

const getBlocked = () => JSON.parse(fs.readFileSync(blockFile, "utf8"));
const saveBlocked = (data) => fs.writeFileSync(blockFile, JSON.stringify(data, null, 4));

function addBlock(guildId, commandName, userId) {
    const blocked = getBlocked();
    if (!blocked[guildId]) blocked[guildId] = {};
    if (!blocked[guildId][commandName]) blocked[guildId][commandName] = [];
    if (!blocked[guildId][commandName].includes(userId)) {
        blocked[guildId][commandName].push(userId);
        saveBlocked(blocked);
    }
}

function removeBlock(guildId, commandName, userId) {
    const blocked = getBlocked();
    if (blocked[guildId]?.[commandName]) {
        blocked[guildId][commandName] = blocked[guildId][commandName].filter(id => id !== userId);
        if (blocked[guildId][commandName].length === 0) delete blocked[guildId][commandName];
        saveBlocked(blocked);
    }
}

function isBlocked(guildId, commandName, userId) {
    const blocked = getBlocked();
    return blocked[guildId]?.[commandName]?.includes(userId) || false;
}

function getBlockedUsers(guildId, commandName) {
    const blocked = getBlocked();
    return blocked[guildId]?.[commandName] || [];
}

module.exports = { addBlock, removeBlock, isBlocked, getBlockedUsers };
