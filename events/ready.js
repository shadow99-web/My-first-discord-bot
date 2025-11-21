module.exports = (client) => {
    console.log("AutoPin system loaded.");

    const AutoPin = require("../models/AutoPin");
    const { fetchRyzumiAPI } = require("../utils/ryzumi");

    // 💠 Unique image picker
    function pickUniqueImage(images, usedImages) {
        const fresh = images.filter(img => {
            const url = img.directLink || img.image;
            return !usedImages.includes(url);
        });

        return fresh.length
            ? fresh[Math.floor(Math.random() * fresh.length)]
            : null;
    }

    // Main autopost loop — runs every 20 seconds
    setInterval(async () => {
        try {
            const tasks = await AutoPin.find();
            if (!tasks.length) return;

            tasks.forEach(async (task) => {
                try {
                    const now = Date.now();

                    if (now - task.lastPost < task.interval) return;

                    const channel = client.channels.cache.get(task.channelId);
                    if (!channel) return;

                    const randomPage = Math.floor(Math.random() * 5) + 1;

                    const data = await fetchRyzumiAPI("/search/pinterest", {
                        query: task.query,
                        page: randomPage,
                    });

                    // Safety check
                    if (!data || !Array.isArray(data) || data.length === 0) return;

                    let img = pickUniqueImage(data, task.postedImages);

                    if (!img) {
                        img = data[Math.floor(Math.random() * data.length)];
                    }

                    const url = img.directLink || img.image;

                    task.postedImages.push(url);

                    if (task.postedImages.length > task.maxHistory) {
                        task.postedImages = task.postedImages.slice(-task.maxHistory);
                    }

                    await channel.send({
                        content: `<a:gold_butterfly:1439270586571558972> ${task.query}`,
                        embeds: [
                            {
                                color: 0xe60023,
                                title: task.query,
                                image: { url },
                                timestamp: new Date(),
                            },
                        ],
                    });

                    task.lastPost = now;
                    await task.save();

                } catch (err) {
                    console.log(`AutoPost error for ${task.guildId}:`, err);
                }
            });

        } catch (mainErr) {
            console.log("AutoPost main loop error:", mainErr);
        }
    }, 20 * 1000);
};
