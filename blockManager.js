// utils/blockManager.js
const blockedUsers = {}; // { guildId: { commandName: [userIds] } }

function addBlock(guildId, commandName, userId) {
    if (!blockedUsers[guildId]) blockedUsers[guildId] = {};
    if (!blockedUsers[guildId][commandName]) blockedUsers[guildId][commandName] = [];
    
    if (!blockedUsers[guildId][commandName].includes(userId)) {
        blockedUsers[guildId][commandName].push(userId);
    }
}

function isBlocked(guildId, commandName, userId) {
    return blockedUsers[guildId]?.[commandName]?.includes(userId) || false;
}

module.exports = { addBlock, isBlocked };
