const axios = require("axios");
const EmojiLog = require("../models/emojiLogSchema");

async function searchEmojis(query) {
    try {
        const { data } = await axios.get("https://emoji.gg/api/");
        // Filter by name/title
        return data.filter(e => e.title.toLowerCase().includes(query.toLowerCase())).slice(0, 20); 
    } catch (err) {
        console.error("EmojiGG API Error:", err);
        return [];
    }
}

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
