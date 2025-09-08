const { SlashCommandBuilder, EmbedBuilder, ChannelType } = require("discord.js");
const heart = "<a:blue_heart:1414309560231002194>";

function formatList(items, limit = 1000) {
    if (!items || items.length === 0) return "None";
    let joined = items.join(", ");
    if (joined.length > limit) {
        const cut = joined.slice(0, limit);
        const lastComma = cut.lastIndexOf(",");
        const trimmed = cut.slice(0, lastComma > 0 ? lastComma : limit);
        return `${trimmed} …and ${items.length - trimmed.split(",").length} more`;
    }
    return joined;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("serverinfo")
        .setDescription("Get detailed server information"),
    async execute(context) {
        const guild = context.isPrefix ? context.message.guild : context.interaction.guild;

        const totalMembers = guild.memberCount.toString();
        const botCount = guild.members.cache.filter(m => m.user.bot).size.toString();

        const emojis = formatList(guild.emojis.cache.map(e => e.toString()), 500);
        const stickers = formatList(guild.stickers.cache.map(s => s.name), 500);

        const boosters = formatList(
            guild.members.cache.filter(m => m.premiumSince).map(m => `<@${m.id}>`),
            800
        );

        const textChannels = formatList(
            guild.channels.cache.filter(c => c.type === ChannelType.GuildText).map(c => `#${c.name}`),
            800
        );
        const voiceChannels = formatList(
            guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice).map(c => `🔊 ${c.name}`),
            800
        );
        const categories = formatList(
            guild.channels.cache.filter(c => c.type === ChannelType.GuildCategory).map(c => `📂 ${c.name}`),
            800
        );

        const roles = formatList(
            guild.roles.cache.filter(r => r.id !== guild.id).map(r => r.toString()),
            800
        );

        const description = guild.description || "This guild has no description set";
        const verificationLevel = guild.verificationLevel.toString();

        const embed = new EmbedBuilder()
            .setTitle(`🏰 Server Info: ${guild.name}`)
            .setThumbnail(guild.iconURL({ dynamic: true }))
            .setColor("Blue")
            .setTimestamp()
            .addFields(
                { name: '__Server Name__', value: guild.name, inline: true },
                { name: '__Server ID__', value: guild.id.toString(), inline: true },
                { name: '__Description__', value: description, inline: false },
                { name: '__Founder__', value: `<@${guild.ownerId}>`, inline: true },
                { name: '__Creation Date__', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:f>`, inline: true },
                { name: '__Verify Level__', value: verificationLevel, inline: true },
                { name: '__Total Members__', value: totalMembers, inline: true },
                { name: '__Bot Count__', value: botCount, inline: true },
                { name: '__Emojis__', value: emojis, inline: false },
                { name: '__Stickers__', value: stickers, inline: false },
                { name: '__Boosters__', value: `${heart} ${boosters}`, inline: false },
                { name: '__Categories__', value: categories, inline: false },
                { name: '__Text Channels__', value: textChannels, inline: false },
                { name: '__Voice Channels__', value: voiceChannels, inline: false },
                { name: '__Roles__', value: roles, inline: false }
            );

        if (context.isPrefix) await context.message.reply({ embeds: [embed] });
        else await context.interaction.reply({ embeds: [embed] });
    }
};
