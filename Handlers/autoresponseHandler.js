const AutoResponse = require("../models/AutoResponse");

// ➕ Add autoresponse
async function addResponse(guildId, trigger, response, author) {
    trigger = trigger.toLowerCase();

    let doc = await AutoResponse.findOne({ guildId, trigger });

    if (!doc) {
        // create new entry
        doc = await AutoResponse.create({
            guildId,
            trigger,
            responses: [response],
            author
        });
    } else {
        // update existing entry (append new response)
        doc.responses.push(response);
        await doc.save();
    }

    return doc;
}

// ➖ Remove autoresponse
async function removeResponse(guildId, trigger) {
    trigger = trigger.toLowerCase();
    const doc = await AutoResponse.findOneAndDelete({ guildId, trigger });
    return !!doc;
}

// 🔍 Get a response (random from multiple)
async function getResponse(guildId, messageContent) {
    const msg = messageContent.toLowerCase();
    const docs = await AutoResponse.find({ guildId });
    if (!docs.length) return null;

    for (const doc of docs) {
        if (msg.includes(doc.trigger)) {
            const responses = doc.responses;
            return responses[Math.floor(Math.random() * responses.length)];
        }
    }
    return null;
}

// 📜 List all responses for guild
async function listResponses(guildId) {
    return await AutoResponse.find({ guildId });
}

module.exports = {
    addResponse,
    removeResponse,
    getResponse,
    listResponses,
};
