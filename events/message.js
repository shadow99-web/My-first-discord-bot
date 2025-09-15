// events/message.js
const { EmbedBuilder } = require("discord.js");
const { getResponse } = require("../Handlers/autoresponseHandler");
const { sendTicketPanel } = require("../Handlers/ticketHandler");
const { defaultPrefix } = require("../utils/storage");
const { getAutoMod } = require("../Handlers/autoModHandler"); // We'll use getAutoMod for checking

module.exports = function(client, getPrefixes, blockHelpers) {
    client.on("messageCreate", async (message) => {
        if (!message.guild || message.author.bot) return;

        const guildId = message.guild.id;

        // ---------- AFK Remove ----------
        if (client.afk.has(message.author.id)) {
            client.afk.delete(message.author.id);
            message.reply({
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

        // ---------- AutoMod ----------
        try {
            const autoMod = await getAutoMod(guildId);
            const content = message.content.toLowerCase();

            // --- Bad Words ---
            for (const badWord of autoMod.badWords) {
                if (content.includes(badWord.toLowerCase())) {
                    await message.delete().catch(() => {});
                    return message.channel.send({
                        embeds: [new EmbedBuilder()
                            .setColor("Red")
                            .setDescription(`❌ ${message.author} your message contained a forbidden word!`)]
                    }).catch(() => {});
                }
            }

            // --- Anti Links ---
            if (autoMod.antiLinks) {
                const linkRegex = /(https?:\/\/[^\s]+)/gi;
                if (linkRegex.test(content)) {
                    await message.delete().catch(() => {});
                    return message.channel.send({
                        embeds: [new EmbedBuilder()
                            .setColor("Red")
                            .setDescription(`❌ ${message.author} posting links is not allowed!`)]
                    }).catch(() => {});
                }
            }
        } catch (err) {
            console.error("❌ AutoMod check failed:", err);
        }

        // ---------- Autoresponse ----------
        try {
            const response = await getResponse(guildId, message.content);
            if (response) {
                await message.channel.send(response).catch(() => {});
                return;
            }
        } catch (err) {
            console.error("❌ Autoresponse failed:", err);
        }

        // ---------- Prefix Commands ----------
        const prefixes = getPrefixes();
        const guildPrefix = prefixes[guildId] || defaultPrefix;
        if (!message.content.startsWith(guildPrefix)) return;

        const args = message.content.slice(guildPrefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();

        const command = client.commands.get(commandName);
        if (!command) return;

        // ---------- Block Check ----------
        if (blockHelpers?.isBlocked && blockHelpers.isBlocked(message.author.id, guildId, commandName)) {
            return message.reply("🚫 You are blocked from using this command.");
        }

        // ---------- Ticket Prefix Command ----------
        if (commandName === "ticket") {
            await sendTicketPanel(message.channel);
            return message.reply("✅ Ticket panel sent!");
        }

        // ---------- Execute Command ----------
try {
    if (command.prefixExecute) {
        await command.prefixExecute(message, args, client); // ✅ use prefixExecute if available
    } else {
        await command.execute({ message, args, client, isPrefix: true });
    }
} catch (err) {
    console.error("❌ Prefix command failed:", err);
    message.reply("❌ Something went wrong executing this command.").catch(() => {});
}
