// Handlers/autoroleHandler.js
const Autorole = require("../models/autoroleSchema");

async function getAutorole(guildId) {
    let doc = await Autorole.findOne({ guildId });
    if (!doc) {
        doc = new Autorole({ guildId, humans: [], bots: [] });
        await doc.save();
    }
    return doc;
}

async function addAutorole(guildId, type, roleId) {
    const doc = await getAutorole(guildId);
    if (!doc[type].includes(roleId)) {
        doc[type].push(roleId);
        await doc.save();
    }
    return doc;
}

async function removeAutorole(guildId, type, roleId) {
    const doc = await getAutorole(guildId);
    doc[type] = doc[type].filter(r => r !== roleId);
    await doc.save();
    return doc;
}

async function resetAutorole(guildId) {
    const doc = await getAutorole(guildId);
    doc.humans = [];
    doc.bots = [];
    await doc.save();
    return doc;
}
async function getAutoroleConfig(guildId) {
    return await getAutorole(guildId);
}

module.exports = { 
    getAutorole, 
    addAutorole, 
    removeAutorole, 
    resetAutorole,
    getAutoroleConfig 
};
