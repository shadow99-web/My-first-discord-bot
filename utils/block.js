const { getBlocked, saveBlocked } = require("./storage");
const devID = process.env.DEV_ID;

const isBlocked = (userId, guildId, commandName) => {
    const blocked = getBlocked();
    const guildBlocked = blocked[guildId] || {};
    const commandBlocked = guildBlocked[commandName] || [];
    return userId !== devID && commandBlocked.includes(userId);
};

const addBlock = (guildId, commandName, userId) => {
    const blocked = getBlocked();
    if (!blocked[guildId]) blocked[guildId] = {};
    if (!blocked[guildId][commandName]) blocked[guildId][commandName] = [];
    if (!blocked[guildId][commandName].includes(userId)) {
        blocked[guildId][commandName].push(userId);
        saveBlocked(blocked);
    }
};

const removeBlock = (guildId, commandName, userId) => {
    const blocked = getBlocked();
    if (blocked[guildId]?.[commandName]) {
        blocked[guildId][commandName] = blocked[guildId][commandName].filter(id => id !== userId);
        if (blocked[guildId][commandName].length === 0) delete blocked[guildId][commandName];
        saveBlocked(blocked);
    }
};

const getBlockedUsers = (guildId, commandName) => {
    const blocked = getBlocked();
    return blocked[guildId]?.[commandName] || [];
};

module.exports = { isBlocked, addBlock, removeBlock, getBlockedUsers };
