const ReactLock = require("../models/reactLock.js");

module.exports = {
  name: "messageReactionRemove",
  async execute(reaction, user) {
    if (user.bot) return;

    try {
      const msg = reaction.message;
      const lock = await ReactLock.findOne({ messageId: msg.id });
      if (!lock) return;

      // Optional: add bypass role check
      const member = await msg.guild.members.fetch(user.id);
      if (member.roles.cache.some(r => ["Admin", "Moderator"].includes(r.name))) return;

      // Re-add removed reaction
      await msg.react(reaction.emoji);
    } catch (err) {
      console.error("Reaction re-add failed:", err);
    }
  }
};
