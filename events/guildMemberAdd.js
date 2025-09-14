// events/guildMemberAdd.js
const { EmbedBuilder } = require("discord.js");
const { load, getChannel } = require("../Handlers/greetHandler");

module.exports = (client) => {
    client.on("guildMemberAdd", async (member) => {
        const db = load();
        const guildId = member.guild.id;

        // Check if greet exists
        if (!db[guildId] || !db[guildId].greet) return;

        const greet = db[guildId].greet;
        const channelId = db[guildId].channel || member.guild.systemChannelId;
        if (!channelId) return;

        const channel = member.guild.channels.cache.get(channelId);
        if (!channel) return;

        // Replace placeholders
        let text = greet.text || "";
        text = text
            .replace(/{user}/gi, member.toString())
            .replace(/{server}/gi, member.guild.name)
            .replace(/{count}/gi, member.guild.memberCount.toString());

        // Build embed
        const embed = new EmbedBuilder()
            .setColor("Blue")
            .setDescription(text || "👋 Welcome!")
            .setFooter({ text: `Added by ${greet.author}` });

        try {
            await channel.send({
                embeds: [embed],
                files: greet.attachment ? [greet.attachment] : []
            });
        } catch (err) {
            console.error("Failed to send greet:", err);
        }
    });
};
