const { getAutoMod } = require("../Handlers/autoModHandler");

const spamTracker = new Map(); // userId -> { count, lastMessage }

module.exports = (client) => {
    client.on("messageCreate", async (message) => {
        if (!message.guild || message.author.bot) return;

        try {
            const settings = await getAutoMod(message.guild.id);
            if (!settings) return;

            // --- BAD WORDS ---
            if (settings.badWords?.length) {
                const lowerMsg = message.content.toLowerCase();
                if (settings.badWords.some(word => lowerMsg.includes(word.toLowerCase()))) {
                    await message.delete().catch(() => {});
                    return message.channel.send(`${message.author}, 🚫 that word is not allowed here.`).then(m => {
                        setTimeout(() => m.delete().catch(() => {}), 5000);
                    });
                }
            }

            // --- ANTI LINKS ---
            if (settings.antiLinks) {
                const linkRegex = /(https?:\/\/[^\s]+)/gi;
                if (linkRegex.test(message.content)) {
                    await message.delete().catch(() => {});
                    return message.channel.send(`${message.author}, 🚫 links are not allowed here.`).then(m => {
                        setTimeout(() => m.delete().catch(() => {}), 5000);
                    });
                }
            }

            // --- ANTI SPAM ---
            if (settings.antiSpam) {
                const userId = message.author.id;
                const now = Date.now();
                const spamData = spamTracker.get(userId) || { count: 0, lastMessage: now };

                if (now - spamData.lastMessage < 5000) {
                    spamData.count++;
                } else {
                    spamData.count = 1; // reset if > 5s
                }
                spamData.lastMessage = now;
                spamTracker.set(userId, spamData);

                if (spamData.count >= 5) { // 5 messages in 5s
                    const duration = (settings.muteDuration || 5) * 60 * 1000; // fallback 5 mins
                    await message.member.timeout(duration, "Spam detected").catch(() => {});
                    spamTracker.set(userId, { count: 0, lastMessage: now }); // reset
                    return message.channel.send(`${message.author} has been muted for spamming ⛔`).catch(() => {});
                }
            }
        } catch (err) {
            console.error("❌ AutoMod Error:", err);
        }
    });
};
