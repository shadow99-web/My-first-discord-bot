const axios = require("axios");
const EmojiLog = require("../models/emojiLogSchema");

/**
 * Search emojis from Discadia API
 * @param {string} query - Emoji name to search
 * @returns {Array} List of emojis
 */
async function searchEmojis(query) {
    try {
        const { data } = await axios.get(
            `https://emoji.discadia.com/emojis/search?q=${encodeURIComponent(query)}`
        );

        if (!Array.isArray(data)) return [];

        // Normalize results
        return data.slice(0, 20).map(e => {
            const url = e.url;
            const format = url.endsWith(".gif") ? "GIF" : "PNG"; // format detection
            return {
                name: e.name || "Unknown",
                url,
                animated: e.animated || false,
                format,
                size: e.size || "Unknown" // Discadia sometimes returns size in KB
            };
        });
    } catch (err) {
        console.error("Discadia API Error:", err.message || err);
        return [];
    }
}

/**
 * Log emoji additions to MongoDB
 */
async function logEmoji(guildId, userId, emojiName, emojiUrl) {
    try {
        const log = new EmojiLog({
            guildId,
            userId,
            emojiName,
            emojiUrl,
            timestamp: new Date()
        });
        await log.save();
    } catch (err) {
        console.error("MongoDB Emoji Log Error:", err);
    }
}

module.exports = { searchEmojis, logEmoji };
