module.exports = (client) => {
    console.log("AutoPin system loaded.");

    const AutoPin = require("../models/AutoPin");
    const { fetchRyzumiAPI } = require("../utils/ryzumi");

    // Main autopost loop — runs every 20 seconds
    setInterval(async () => {
        try {
            // Fetch all tasks
            const tasks = await AutoPin.find();
            if (!tasks.length) return;

            // Run all autoposts *simultaneously*
            tasks.forEach(async (task) => {
                try {
                    const now = Date.now();

                    // Not time yet? Skip
                    if (now - task.lastPost < task.interval) return;

                    const channel = client.channels.cache.get(task.channelId);
                    if (!channel) return;

                    // Fetch Pinterest image
                    const data = await fetchRyzumiAPI("/search/pinterest", {
                        query: task.query,
                    });

                    if (!data || !data.length) return;

                    const img = data[Math.floor(Math.random() * data.length)];

                    // Send autopost
                    await channel.send({
                        content: `<a:gold_butterfly:1439270586571558972> ${task.query}`,
                        embeds: [
                            {
                                color: 0xe60023,
                                title: task.query,
                                image: { url: img.directLink || img.image },
                                timestamp: new Date(),
                            },
                        ],
                    });

                    // Update timestamp
                    task.lastPost = now;
                    await task.save();
                } catch (err) {
                    console.log(`AutoPost error for ${task.guildId}:`, err);
                }
            });

        } catch (mainErr) {
            console.log("AutoPost main loop error:", mainErr);
        }
    }, 20 * 1000); // check every 20 seconds
};
