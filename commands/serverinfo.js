const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("serverinfo")
        .setDescription("Get detailed server information"),
    async execute(context) {
        const guild = context.isPrefix ? context.message.guild : context.interaction.guild;

        // Users info
        const totalMembers = guild.memberCount;
        const botCount = guild.members.cache.filter(m => m.user.bot).size;

        // Emojis & Stickers
        const totalEmojis = guild.emojis.cache.size;
        const animatedEmojis = guild.emojis.cache.filter(e => e.animated).size;
        const normalEmojis = totalEmojis - animatedEmojis;
        const stickersCount = guild.stickers.cache.size;

        // Boost info
        const totalBoosts = guild.premiumSubscriptionCount;
        const boostLevel = guild.premiumTier;
        const boosters = guild.members.cache.filter(m => m.premiumSince).map(m => `<@${m.id}>`).join(", ") || "No one boosted this guild";

        // Channels info
        const totalChannels = guild.channels.cache.size;
        const textChannels = guild.channels.cache.filter(c => c.type === 0).size; // 0 = GuildText
        const voiceChannels = guild.channels.cache.filter(c => c.type === 2).size; // 2 = GuildVoice
        const categories = guild.channels.cache.filter(c => c.type === 4).size; // 4 = GuildCategory

        // Description & Verification
        const description = guild.description || "This guild has no description set";
        const verificationLevel = guild.verificationLevel;

        // Create Embed
        const embed = new EmbedBuilder()
            .setTitle(`🏰 Server Info: ${guild.name}`)
            .setThumbnail(guild.iconURL({ dynamic: true }))
            .setColor("Blue")
            .setTimestamp()
            .addFields(
                // Server Info
                { name: '📌 __Server Name__', value: `> ${guild.name}`, inline: true },
                { name: '🆔 __Server ID__', value: `> ${guild.id}`, inline: true },
                { name: '📝 __Description__', value: `> ${description}`, inline: false },
                { name: '👑 __Founder__', value: `> <@${guild.ownerId}>`, inline: true },
                { name: '📅 __Creation Date__', value: `> <t:${Math.floor(guild.createdTimestamp/1000)}:f>`, inline: true },
                { name: '🎭 __Total Roles__', value: `> ${guild.roles.cache.size}`, inline: true },
                { name: '✅ __Verify Level__', value: `> ${verificationLevel}`, inline: true },

                // Users Info
                { name: '👥 __Total Members__', value: `> ${totalMembers}`, inline: true },
                { name: '🤖 __Bot Count__', value: `> ${botCount}`, inline: true },

                // Emojis & Stickers
                { name: '😀 __Total Emojis__', value: `> ${totalEmojis}`, inline: true },
                { name: '😄 __Normal__', value: `> ${normalEmojis}`, inline: true },
                { name: '✨ __Animated__', value: `> ${animatedEmojis}`, inline: true },
                { name: '🏷️ __Stickers__', value: `> ${stickersCount}`, inline: true },

                // Boost Info
                { name: '🚀 __Total Boosts__', value: `> ${totalBoosts}`, inline: true },
                { name: '💎 __Boost Level__', value: `> ${boostLevel}`, inline: true },
                { name: '🏅 __Booster__', value: `> ${boosters}`, inline: false },

                // Channels Info
                { name: '📁 __Total Channels__', value: `> ${totalChannels}`, inline: true },
                { name: '📝 __Text Channels__', value: `> ${textChannels}`, inline: true },
                { name: '🔊 __Voice Channels__', value: `> ${voiceChannels}`, inline: true },
                { name: '📂 __Categories__', value: `> ${categories}`, inline: true }
            );

        if (context.isPrefix) await context.message.reply({ embeds: [embed] });
        else await context.interaction.reply({ embeds: [embed] });
    }
};
