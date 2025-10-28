// events/activityRestore.js
const { ActivityType } = require("discord.js");
const ActivitySettings = require("../models/ActivitySettings");

module.exports = (client) => {
  client.once("ready", async () => {
    try {
      const saved = await ActivitySettings.findOne({ botId: client.user.id });

      if (saved) {
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
    } catch (err) {
      console.error("❌ Error restoring activity:", err);
    }
  });
};
