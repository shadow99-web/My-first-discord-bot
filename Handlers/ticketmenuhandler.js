const { EmbedBuilder } = require("discord.js");
const { getResponse } = require("./autoresponseHandler"); // Correct relative path

// This function sends the ticket panel
async function sendTicketPanel(channel) {
    const blueHeart = "<a:blue_heart_1414309560231002194:1414309560231002194>";

    const embed = new EmbedBuilder()
        .setColor("Blue")
        .setTitle("🎟️ Ticket System")
        .setDescription(`${blueHeart} Need help? Select a category below to create a private ticket.`)
        .setTimestamp();

    const { ActionRowBuilder, StringSelectMenuBuilder } = require("discord.js");

    const menu = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId("ticket_menu")
            .setPlaceholder("📂 Choose a ticket category")
            .addOptions([
                { label: "General Support", value: "general", emoji: "🤝" },
                { label: "Appeal to be Staff", value: "staff", emoji: "🥂" },
                { label: "Appeal Ban for Member", value: "ban", emoji: "❌" },
                { label: "Report a Member", value: "report", emoji: "💢" }
            ])
    );

    await channel.send({ embeds: [embed], components: [menu] });
}

module.exports = (client, getPrefixes, blockHelpers) => {
    client.on("messageCreate", async (message) => {
        if (!message.guild || message.author.bot) return;

        // ---------- AFK Remove ----------
        if (client.afk.has(message.author.id)) {
            client.afk.delete(message.author.id);
            message.reply({
                embeds: [new EmbedBuilder().setColor("Green").setDescription("✅ You are no longer AFK.")]
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
        const response = getResponse(message.guild.id, message.content.toLowerCase());
        if (response) {
            const payload = {};
            if (response.text && response.text.trim() !== "") payload.content = response.text;
            if (response.attachments?.length > 0) payload.files = response.attachments;
            if (Object.keys(payload).length > 0) return message.channel.send(payload).catch(() => {});
        }

        // ---------- Prefix Commands ----------
        const prefixes = getPrefixes();
        const guildPrefix = prefixes[message.guild.id] || require("../utils/storage").defaultPrefix;
        if (!message.content.startsWith(guildPrefix)) return;

        const args = message.content.slice(guildPrefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();

        const command = client.commands.get(commandName);
        if (!command) return;

        // ---------- Block Check ----------
        if (blockHelpers?.isBlocked && blockHelpers.isBlocked(message.author.id, message.guild.id, commandName)) {
            return message.reply("🚫 You are blocked from using this command.");
        }

        // ---------- Ticket Prefix Command ----------
        if (commandName === "ticket") {
            await sendTicketPanel(message.channel);
            return message.reply("✅ Ticket panel sent!");
        }

        // ---------- Execute Command ----------
        try {
            await command.execute({ message, args, client, isPrefix: true });
        } catch (err) {
            console.error(err);
            message.reply("❌ Something went wrong executing this command.").catch(() => {});
        }
    });
};

// Export sendTicketPanel for external use
module.exports.sendTicketPanel = sendTicketPanel;
