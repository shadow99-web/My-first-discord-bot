const { EmbedBuilder } = require("discord.js");
const { getPrefixes } = require("../utils/storage");
const { handleMessage } = require("../Handlers/ticketmenuhandler");

module.exports = (client) => {
    client.on("messageCreate", async (message) => {
        if (!message.guild || message.author.bot) return;

        // Handle AFK removal
        if (client.afk.has(message.author.id)) {
            client.afk.delete(message.author.id);
            message.reply({ embeds: [new EmbedBuilder().setColor("Green").setDescription("✅ You are no longer AFK.")] }).catch(() => {});
        }

        // Handle AFK mentions
        if (message.mentions.users.size > 0) {
            message.mentions.users.forEach(user => {
                if (client.afk.has(user.id)) {
                    const data = client.afk.get(user.id);
                    const since = `<t:${Math.floor(data.since / 1000)}:R>`;
                    message.reply({
                        embeds: [new EmbedBuilder()
                            .setColor("Blue")
                            .setTitle(`${user.tag} is AFK`)
                            .setDescription(`✨ Reason: **${data.reason}**\nSince: ${since}`)]
                    }).catch(() => {});
                }
            });
        }

        // Handle prefix commands including ticket
        const prefixes = getPrefixes();
        const guildPrefix = prefixes[message.guild.id] || "!";
        await handleMessage(message, guildPrefix);
    });
};
