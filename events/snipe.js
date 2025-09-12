module.exports = (client) => {
    client.on("messageDelete", (message) => {
        if (!message.guild || message.author.bot) return;

        const snipes = client.snipes.get(message.channel.id) || [];
        snipes.unshift({
            content: message.content || "*No text (embed/attachment)*",
            author: message.author.tag,
            authorId: message.author.id,
            avatar: message.author.displayAvatarURL({ dynamic: true }),
            createdAt: message.createdTimestamp,
            attachment: message.attachments.first()?.url || null
        });

        if (snipes.length > 5) snipes.pop();
        client.snipes.set(message.channel.id, snipes);
    });
};
