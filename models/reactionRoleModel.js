const mongoose = require("mongoose");

const reactionRoleSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    messageId: { type: String, required: true },
    roles: { type: Object, default: {} } // { "😀": "roleId", "❤️": "roleId" }
});

module.exports = mongoose.model("ReactionRole", reactionRoleSchema);
