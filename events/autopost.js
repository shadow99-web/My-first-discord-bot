const AutoPin = require("../models/AutoPin");
const { fetchRyzumiAPI } = require("../utils/ryzumi");

module.exports = {
  name: "ready",
  async execute(client) {
    console.log("AutoPin system loaded.");

    setInterval(async () => {
      const tasks = await AutoPin.find();

      for (const task of tasks) {
        const now = Date.now();
        if (now - task.lastPost < task.interval) continue;

        const channel = client.channels.cache.get(task.channelId);
        if (!channel) continue;

        try {
          const data = await fetchRyzumiAPI("/search/pinterest", {
            query: task.query,
          });

          if (!data?.length) continue;

          const img = data[Math.floor(Math.random() * data.length)];

          await channel.send({
            content: `<a:gold_butterfly:1439270586571558972> **AutoPost:** ${task.query}`,
            embeds: [
              {
                color: 0xe60023,
                title: task.query,
                image: { url: img.directLink || img.image },
                timestamp: new Date(),
              },
            ],
          });

          task.lastPost = now;
          await task.save();
        } catch (e) {
          console.log("Auto post error:", e);
        }
      }
    }, 20 * 1000); // every 20 seconds
  },
};
