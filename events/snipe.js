module.exports = (client) => {
    client.on("messageDelete", async (message) => {
        if (!message.guild || message.author.bot) return;

        if (!client.snipes) client.snipes = new Map();
        const snipes = client.snipes.get(message.channel.id) || [];

        let deleter = null;

        try {
            // Fetch audit logs to see who deleted the message
            const logs = await message.guild.fetchAuditLogs({
                type: "MESSAGE_DELETE",
                limit: 1
            });
            const entry = logs.entries.first();

            if (entry) {
                // Check if the deleted message matches
                if (entry.target.id === message.author.id && (Date.now() - entry.createdTimestamp) < 5000) {
                    deleter = entry.executor.tag; // Who deleted the message
                }
            }
        } catch (err) {
            console.error("Failed to fetch audit logs for snipe:", err);
        }

        snipes.unshift({
            content: message.content || "*No text (embed/attachment)*",
            author: message.author.tag || "Unknown#0000",
            authorId: message.author.id,
            avatar: message.author.displayAvatarURL({ dynamic: true }),
            createdAt: message.createdTimestamp,
            attachment: message.attachments.first()?.url || null,
            deletedBy: deleter // Could be null if self-deleted
        });

        if (snipes.length > 5) snipes.pop();
        client.snipes.set(message.channel.id, snipes);
    });
};
