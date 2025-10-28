const ActivitySettings = require("../models/ActivitySettings");

module.exports = async (client) => {
  const saved = await ActivitySettings.findOne({ botId: client.user.id });
  if (saved) {
    const { ActivityType } = require("discord.js");
    const typeMap = {
      playing: ActivityType.Playing,
      listening: ActivityType.Listening,
      watching: ActivityType.Watching,
      competing: ActivityType.Competing,
    };
    client.user.setActivity(saved.text, { type: typeMap[saved.type] });
    console.log(`✅ Restored activity: ${saved.type} ${saved.text}`);
  } else {
    console.log("ℹ️ No saved bot activity found.");
  }
};
