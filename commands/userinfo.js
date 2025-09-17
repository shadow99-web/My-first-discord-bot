const { SlashCommandBuilder, EmbedBuilder, userMention } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("userinfo")
        .setDescription("Get detailed information about a user")
        .addUserOption(opt =>
            opt.setName("target")
                .setDescription("Select a user")
        ),

    name: "userinfo", // prefix support
    aliases: ["whois", "uinfo", "ui"],

    async execute({ interaction, message, client }) {
        const target = interaction 
            ? interaction.options.getUser("target") || interaction.user
            : message.mentions.users.first() || message.author;

        const member = interaction 
            ? await interaction.guild.members.fetch(target.id).catch(() => null)
            : message.guild.members.cache.get(target.id);

        // ✅ Badges Mapping
        const badgeMap = {
            HypesquadBalance: "<:HypeSquad_Balance:1378390177558560909>",
            HypesquadBravery: "🦁",
            HypesquadBrilliance: "🦉",
            BugHunterLevel1: "🐛",
            BugHunterLevel2: "🔧",
            VerifiedBot: "🤖",
            Partner: "💎",
            EarlySupporter: "🌟",
            ActiveDeveloper: "⚡",
            PremiumEarlySupporter: "💠",
        };

        let badges = "None";
        if (target.flags) {
            badges = target.flags.toArray().map(f => badgeMap[f] || f).join(" ");
        }

        // ✅ Roles
        const roles = member ? member.roles.cache
            .filter(r => r.id !== member.guild.id)
            .map(r => r.toString())
            .join(", ") || "None" : "Unknown";

        const highestRole = member ? member.roles.highest.toString() : "Unknown";

        // ✅ Timestamps
        const createdAt = `<t:${Math.floor(target.createdTimestamp / 1000)}:R>`;
        const joinedAt = member ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : "Unknown";

        // ✅ Avatar + Banner
        const avatarURL = target.displayAvatarURL({ size: 1024, dynamic: true });
        const banner = await client.users.fetch(target.id, { force: true })
            .then(u => u.bannerURL({ size: 1024, dynamic: true }))
            .catch(() => null);

        // ✅ Embed
        const embed = new EmbedBuilder()
            .setAuthor({ name: `${target.tag}`, iconURL: avatarURL })
            .setColor("Blue")
            .setThumbnail(avatarURL)
            .setDescription(`💙 **User Information**`)
            .addFields(
                { name: "🪪 Basic Info", value: `> **Default Name:** ${target.username}\n> **ID:** ${target.id}\n> **Global Name:** ${target.globalName || "None"}\n> **Bot?:** ${target.bot ? "✅" : "<:Flixo_no:1368488280714121297>"}` },
                { name: "🏅 Badges", value: badges, inline: false },
                { name: "📅 Timestamps", value: `> **Created:** ${createdAt}\n> **Joined:** ${joinedAt}`, inline: false },
                { name: "🎭 Roles", value: `> **Highest Role:** ${highestRole}\n> **All Roles:** ${roles}`, inline: false }
            )
            .setFooter({ text: `Requested by ${interaction?.user.tag || message.author.tag}` })
            .setTimestamp();

        if (banner) embed.setImage(banner);

        // ✅ Reply Handler
        if (interaction) {
            await interaction.reply({ embeds: [embed], ephemeral: false });
        } else {
            await message.reply({ embeds: [embed] });
        }
    }
};
