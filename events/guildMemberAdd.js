// events/guildMemberAdd.js
const { EmbedBuilder } = require("discord.js");
const { getGreet, getChannel } = require("../Handlers/greetHandler");

module.exports = (client) => {
    client.on("guildMemberAdd", async (member) => {
        const guildId = member.guild.id;

        // ⏳ Fetch greet from Mongo
        const greet = await getGreet(guildId);
        if (!greet) return;

        // ⏳ Get channel from Mongo or fallback to system channel
        const channelId = await getChannel(guildId) || member.guild.systemChannelId;
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
            .setFooter({ text: `Added by ${greet.author || "Unknown"}` });

        try {
            await channel.send({
                embeds: [embed],
                files: greet.attachment ? [greet.attachment] : []
            });
        } catch (err) {
            console.error("❌ Failed to send greet:", err);
        }
    });
};
