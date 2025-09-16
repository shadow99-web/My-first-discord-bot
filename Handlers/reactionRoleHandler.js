const ReactionRole = require("../models/reactionRoleModel");

// ➕ Add or edit reaction role
async function setReactionRole(guildId, messageId, emoji, roleId) {
    let doc = await ReactionRole.findOne({ guildId, messageId });
    if (!doc) {
        doc = new ReactionRole({ guildId, messageId, roles: {} });
    }
    doc.roles[emoji] = roleId;
    await doc.save();
    return doc;
}

// ➖ Remove specific emoji binding
async function removeReactionRole(guildId, messageId, emoji) {
    const doc = await ReactionRole.findOne({ guildId, messageId });
    if (!doc) return null;

    delete doc.roles[emoji];
    await doc.save();
    return doc;
}

// 🔍 Get all roles for a message
async function getReactionRoles(guildId, messageId) {
    const doc = await ReactionRole.findOne({ guildId, messageId });
    return doc ? doc.roles : {};
}

// ❌ Reset roles for a message
async function resetReactionRoles(guildId, messageId) {
    await ReactionRole.deleteOne({ guildId, messageId });
}

module.exports = {
    setReactionRole,
    removeReactionRole,
    getReactionRoles,
    resetReactionRoles
};
