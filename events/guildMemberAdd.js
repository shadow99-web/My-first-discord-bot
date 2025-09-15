// events/guildMemberAdd.js
const { EmbedBuilder } = require("discord.js");
const { getGreet, getChannel } = require("../Handlers/greetHandler");
const { getAutoroleConfig } = require("../Handlers/autoroleHandler");

module.exports = (client) => {
    client.on("guildMemberAdd", async (member) => {
        const guildId = member.guild.id;

        // ---------- Greet System ----------
        try {
            const greet = await getGreet(guildId);
            const channelId = await getChannel(guildId) || member.guild.systemChannelId;

            if (greet && channelId) {
                const channel = member.guild.channels.cache.get(channelId);
                if (channel) {
                    let text = greet.text || "";
                    text = text
                        .replace(/{user}/gi, member.toString())
                        .replace(/{server}/gi, member.guild.name)
                        .replace(/{count}/gi, member.guild.memberCount.toString());

                    const embed = new EmbedBuilder()
                        .setColor("Blue")
                        .setDescription(text || "👋 Welcome!")
                        .setFooter({ text: `Added by ${greet.author || "Bot"}` });

                    await channel.send({
                        embeds: [embed],
                        files: greet.attachment ? [greet.attachment] : []
                    });
                }
            }
        } catch (err) {
            console.error("❌ Failed to send greet:", err);
        }

        // ---------- Autorole System (MongoDB) ----------
        try {
            const guildConfig = await getAutoroleConfig(guildId);
            if (!guildConfig) return; // ⬅️ Prevents crash if no config found

            const roleIds = member.user.bot ? guildConfig.bots : guildConfig.humans;
            if (!roleIds || roleIds.length === 0) return;

            const applied = [];
            for (const roleId of roleIds) {
                const role = member.guild.roles.cache.get(roleId);
                if (!role) continue;
                try {
                    await member.roles.add(roleId, "Autorole: assigned on join");
                    applied.push(`<@&${roleId}>`);
                } catch (err) {
                    console.warn(`❌ Failed to add role ${roleId} to ${member.user.tag}: ${err.message}`);
                }
            }

            if (applied.length > 0) {
                const blueHeart = "<a:blue_heart:1414309560231002194>";
                const dmEmbed = new EmbedBuilder()
                    .setColor("Blue")
                    .setTitle(`Welcome to ${member.guild.name}!`)
                    .setDescription(`${blueHeart} You have been given the following role(s):\n${applied.join(", ")}`)
                    .setTimestamp();

                member.send({ embeds: [dmEmbed] }).catch(() => {});
            }
        } catch (err) {
            console.error("❌ Failed to assign autorole:", err);
        }
    });
};
