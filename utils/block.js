const { getBlocked, saveBlocked } = require("./storage");

const isBlocked = (userId, guildId, commandName) => {
    const blocked = getBlocked();
    const guildBlocked = blocked[guildId] || {};
    const commandBlocked = guildBlocked[commandName] || [];
    return commandBlocked.includes(userId);
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

        // If command has no blocked users → delete command
        if (blocked[guildId][commandName].length === 0) {
            delete blocked[guildId][commandName];
        }

        // If guild has no blocked commands → delete guild
        if (Object.keys(blocked[guildId]).length === 0) {
            delete blocked[guildId];
        }

        saveBlocked(blocked);
    }
};

module.exports = { isBlocked, addBlock, removeBlock };
