const { load } = require("../Handlers/automodHandler");

module.exports = (client) => {
    client.on("messageCreate", async (message) => {
        if (!message.guild || message.author.bot) return;

        const guildId = message.guild.id;
        const settings = load()[guildId] || { enabled: [], badwords: [] };

        // 🔹 BADWORDS FILTER
        if (settings.enabled.includes("badwords") && settings.badwords.length) {
            const content = message.content.toLowerCase();
            if (settings.badwords.some(w => content.includes(w))) {
                try {
                    await message.delete();
                    await message.channel.send({
                        content: `🤬 ${message.author}, your message contained a banned word!`
                    }).then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
                } catch (err) {
                    console.error("Failed to delete badword message:", err);
                }
                return;
            }
        }

        // 🔹 ANTILINK FILTER
        if (settings.enabled.includes("antilink")) {
            const linkRegex = /(https?:\/\/[^\s]+)/gi;
            if (linkRegex.test(message.content)) {
                try {
                    await message.delete();
                    await message.channel.send({
                        content: `🔗 ${message.author}, links are not allowed here!`
                    }).then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
                } catch (err) {
                    console.error("Failed to delete link message:", err);
                }
                return;
            }
        }
    });
};
