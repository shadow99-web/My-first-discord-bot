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

                    // ⭐ FIX 3: Random Pinterest page for more unique images
                    const randomPage = Math.floor(Math.random() * 5) + 1;

                    // Fetch Pinterest images with random page
                    const data = await fetchRyzumiAPI("/search/pinterest", {
                        query: task.query,
                        page: randomPage,  // ⬅ added fix
                    });

                    // 💠 Unique image picker
function pickUniqueImage(images, usedImages) {
    const fresh = images.filter(img => {
        const url = img.directLink || img.image;
        return !usedImages.includes(url);
    });

    // If no fresh images → return null
    return fresh.length ? fresh[Math.floor(Math.random() * fresh.length)] : null;
}

// ⭐ PICK UNIQUE IMAGE
let img = pickUniqueImage(data, task.postedImages);

// Fallback if all images are already used
if (!img) {
    img = data[Math.floor(Math.random() * data.length)];
}

const url = img.directLink || img.image;

// Save image to history
task.postedImages.push(url);

// Auto-clean (avoid database becoming huge)
if (task.postedImages.length > task.maxHistory) {
    task.postedImages = task.postedImages.slice(-task.maxHistory);
}

// Send autopost
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
