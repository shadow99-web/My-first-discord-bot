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
        const textChannels = guild.channels.cache.filter(c => c.type === 0).size;
        const voiceChannels = guild.channels.cache.filter(c => c.type === 2).size;
        const categories = guild.channels.cache.filter(c => c.type === 4).size;

        // Description & Verification
        const description = guild.description || "This guild has no description set";
        const verificationLevel = guild.verificationLevel;

        // Emojis
        const arrow = "<:flecha:1414301944868245574>";
        const blueHeart = "<:blue_heart:1414309560231002194>";

        // Create Embed
        const embed = new EmbedBuilder()
            .setTitle(`🏰 Server Info: ${guild.name}`)
            .setThumbnail(guild.iconURL({ dynamic: true }))
            .setColor("Blue")
            .setTimestamp()
            .addFields(
                // Server Info
                { name: '📌 __Server Name__', value: `${arrow} ${guild.name}`, inline: true },
                { name: '🆔 __Server ID__', value: `${blueHeart} ${guild.id}`, inline: true },
                { name: '📝 __Description__', value: `${arrow} ${description}`, inline: false },
                { name: '👑 __Founder__', value: `${blueHeart} <@${guild.ownerId}>`, inline: true },
                { name: '📅 __Creation Date__', value: `${arrow} <t:${Math.floor(guild.createdTimestamp/1000)}:f>`, inline: true },
                { name: '🎭 __Total Roles__', value: `${blueHeart} ${guild.roles.cache.size}`, inline: true },
                { name: '✅ __Verify Level__', value: `${arrow} ${verificationLevel}`, inline: true },

                // Users Info
                { name: '👥 __Total Members__', value: `${blueHeart} ${totalMembers}`, inline: true },
                { name: '🤖 __Bot Count__', value: `${arrow} ${botCount}`, inline: true },

                // Emojis & Stickers
                { name: '😀 __Total Emojis__', value: `${blueHeart} ${totalEmojis}`, inline: true },
                { name: '😄 __Normal__', value: `${arrow} ${normalEmojis}`, inline: true },
                { name: '✨ __Animated__', value: `${blueHeart} ${animatedEmojis}`, inline: true },
                { name: '🏷️ __Stickers__', value: `${arrow} ${stickersCount}`, inline: true },

                // Boost Info
                { name: '🚀 __Total Boosts__', value: `${blueHeart} ${totalBoosts}`, inline: true },
                { name: '💎 __Boost Level__', value: `${arrow} ${boostLevel}`, inline: true },
                { name: '🏅 __Booster__', value: `${blueHeart} ${boosters}`, inline: false },

                // Channels Info
                { name: '📁 __Total Channels__', value: `${arrow} ${totalChannels}`, inline: true },
                { name: '📝 __Text Channels__', value: `${blueHeart} ${textChannels}`, inline: true },
                { name: '🔊 __Voice Channels__', value: `${arrow} ${voiceChannels}`, inline: true },
                { name: '📂 __Categories__', value: `${blueHeart} ${categories}`, inline: true }
            );

        if (context.isPrefix) await context.message.reply({ embeds: [embed] });
        else await context.interaction.reply({ embeds: [embed] });
    }
};
