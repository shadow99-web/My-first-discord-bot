const ReactLock = require("../models/reactLock.js");

module.exports = {
  name: "messageReactionRemove",
  async execute(reaction, user) {
    try {
      if (user.bot) return;

      const { message } = reaction;
      const data = await ReactLock.findOne({ messageId: message.id });
      if (!data) return; // Not locked

      const lockedUser = data.lockedReactions.find(
        r => r.userId === user.id && r.emoji === reaction.emoji.name
      );
      if (lockedUser) {
        await message.react(reaction.emoji.name);
      }
    } catch (err) {
      console.error("Reaction re-add failed:", err);
    }
  },
};
