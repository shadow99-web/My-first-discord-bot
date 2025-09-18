const axios = require("axios");
const EmojiLog = require("../models/emojiLogSchema");

// ✅ Search emojis using Discadia API
async function searchEmojis(query) {
    try {
        const { data } = await axios.get(`https://discord.com/api/discadia/emojis/search?query=${encodeURIComponent(query)}`);
        
        // Make sure we only return what’s valid (some APIs include partial results)
        return data.emojis
            .filter(e => e.name && e.url) // ensure name and URL exist
            .slice(0, 20); // limit to 20 results
    } catch (err) {
        console.error("Discadia API Error:", err.message);
        return [];
    }
}

// ✅ Log to MongoDB when emoji is added
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
