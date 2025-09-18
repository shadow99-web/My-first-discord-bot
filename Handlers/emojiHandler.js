const axios = require("axios");
const EmojiLog = require("../models/emojiLogSchema");

async function searchEmojis(query) {
    try {
        const { data } = await axios.get("https://emoji.gg/api/");
        
        // Defensive check + fallback search
        return data
            .filter(e => 
                (e.title && e.title.toLowerCase().includes(query.toLowerCase())) || 
                (e.slug && e.slug.toLowerCase().includes(query.toLowerCase())) || 
                (e.id && e.id.toString().includes(query))
            )
            .slice(0, 20); // limit results
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
