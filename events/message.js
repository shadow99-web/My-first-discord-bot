// events/message.js
const { EmbedBuilder } = require("discord.js");
const { getResponse } = require("../Handlers/autoresponseHandler");

module.exports = (client, getPrefixes, blockHelpers) => {
    client.on("messageCreate", async (message) => {
        if (!message.guild || message.author.bot) return;

        const guildId = message.guild.id;
        const userId = message.author.id;

        // ---------- AFK Remove ----------
        if (client.afk.has(userId)) {
            client.afk.delete(userId);
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("Green")
                    .setDescription("✅ You are no longer AFK.")]
            }).catch(() => {});
        }

        // ---------- AFK Mentions ----------
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

        // ---------- Autoresponse ----------
        const response = getResponse(guildId, message.content.toLowerCase().trim());
        if (response) {
            const payload = {};
            if (response.text?.trim()) payload.content = response.text;
            if (response.attachments?.length > 0) payload.files = response.attachments;
            if (Object.keys(payload).length > 0) {
                return message.reply(payload).catch(() => {});
            }
        }

        // ---------- Prefix Handling ----------
        let prefixes = getPrefixes(guildId);
        if (!prefixes || prefixes.length === 0) prefixes = ["!"]; // fallback

        const prefix = prefixes.find(p => message.content.startsWith(p));
        if (!prefix) return;

        const args = message.content.slice(prefix.length).trim().split(/\s+/);
        const commandName = args.shift().toLowerCase();

        const command = client.commands.get(commandName);
        if (!command) return;

        // ---------- Block Check ----------
        if (blockHelpers.isBlocked(guildId, userId)) {
            return message.reply("🚫 You are blocked from using this bot.");
        }

        // ---------- Execute Prefix Command ----------
        try {
            await command.execute({ client, message, args, isPrefix: true });
        } catch (err) {
            console.error(`❌ Error executing command ${commandName}:`, err);
            message.reply("⚠️ Something went wrong while executing this command.").catch(() => {});
        }
    });
};
