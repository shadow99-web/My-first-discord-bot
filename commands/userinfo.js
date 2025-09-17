const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require("discord.js");

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

        // ✅ Badge mapping
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
        try {
            const flags = await target.fetchFlags();
            badges = flags.toArray().map(f => badgeMap[f] || f).join(" ") || "None";
        } catch {
            badges = "Unknown";
        }

        // ✅ Roles
        const roles = member 
            ? member.roles.cache.filter(r => r.id !== member.guild.id).map(r => r.toString()).join(", ") || "None" 
            : "Unknown";

        const highestRole = member ? member.roles.highest.toString() : "Unknown";

        // ✅ Permissions (top 5 important ones)
        let permissions = "Unknown";
        if (member) {
            const perms = [];
            if (member.permissions.has(PermissionsBitField.Flags.Administrator)) perms.push("🛠️ Administrator");
            if (member.permissions.has(PermissionsBitField.Flags.ManageGuild)) perms.push("⚙️ Manage Server");
            if (member.permissions.has(PermissionsBitField.Flags.ManageRoles)) perms.push("🎭 Manage Roles");
            if (member.permissions.has(PermissionsBitField.Flags.ManageChannels)) perms.push("📺 Manage Channels");
            if (member.permissions.has(PermissionsBitField.Flags.BanMembers)) perms.push("🔨 Ban Members");
            permissions = perms.length ? perms.join(", ") : "No special permissions";
        }

        // ✅ Timestamps
        const createdAt = `<t:${Math.floor(target.createdTimestamp / 1000)}:R>`;
        const joinedAt = member?.joinedTimestamp ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : "Unknown";

        // ✅ Avatar + Banner
        const avatarURL = target.displayAvatarURL({ size: 1024, dynamic: true });
        const banner = await client.users.fetch(target.id, { force: true })
            .then(u => u.bannerURL({ size: 1024, dynamic: true }))
            .catch(() => null);

        // ✅ Nickname
        const nickname = member?.nickname || "None";

        // ✅ Embed
        const embed = new EmbedBuilder()
            .setAuthor({ name: `${target.tag}`, iconURL: avatarURL })
            .setColor("Blue")
            .setThumbnail(avatarURL)
            .setDescription(`<a:blue_heart:1414309560231002194> **User Information**`)
            .addFields(
                { name: "🪪 Basic Info", value: `> **Username:** ${target.username}\n> **Global Name:** ${target.globalName || "None"}\n> **ID:** ${target.id}\n> **Nickname:** ${nickname}\n> **Bot?:** ${target.bot ? "✅ Yes" : "❌ No"}` },
                { name: "🏅 Badges", value: badges, inline: false },
                { name: "📅 Timestamps", value: `> **Created:** ${createdAt}\n> **Joined:** ${joinedAt}`, inline: false },
                { name: "🎭 Roles", value: `> **Highest Role:** ${highestRole}\n> **All Roles:** ${roles}`, inline: false },
                { name: "🔒 Permissions", value: permissions, inline: false }
            )
            .setFooter({ text: `Requested by ${interaction?.user.tag || message.author.tag}` })
            .setTimestamp();

        if (banner) embed.setImage(banner);

        // ✅ Reply handler
        if (interaction) {
            await interaction.reply({ embeds: [embed] });
        } else {
            await message.reply({ embeds: [embed] });
        }
    }
};
