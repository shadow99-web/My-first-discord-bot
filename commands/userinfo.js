const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require("discord.js");

const blueHeart = "<a:blue_heart:1414309560231002194>";

module.exports = {
    data: new SlashCommandBuilder()
        .setName("userinfo")
        .setDescription("Get detailed information about a user (even outside this server)")
        .addUserOption(opt =>
            opt.setName("target")
                .setDescription("Select a user")
        )
        .addStringOption(opt =>
            opt.setName("userid")
                .setDescription("Enter a user ID if they’re not in this server")
        ),

    name: "userinfo",
    aliases: ["whois", "uinfo", "ui"],

    async execute({ interaction, message, client, args }) {
        const isPrefix = !!message;
        let user = null;

        // 🧠 Input extraction
        let input;
        if (interaction) {
            input = interaction.options.getUser("target") || interaction.options.getString("userid");
        } else {
            input = message.mentions.users.first() || args[0];
        }

        // ✅ Fetch user from input
        try {
            if (!input) {
                user = interaction ? interaction.user : message.author;
            } else if (typeof input === "object" && input.id) {
                user = await client.users.fetch(input.id, { force: true });
            } else if (/^\d{17,19}$/.test(input)) {
                // Raw user ID
                user = await client.users.fetch(input, { force: true });
            } else {
                user = interaction ? interaction.user : message.author;
            }
        } catch {
            return isPrefix
                ? message.reply("❌ Unable to find that user. Make sure the ID is valid.")
                : interaction.reply({ content: "❌ Unable to find that user. Make sure the ID is valid.", ephemeral: true });
        }

        // 🧩 Try to fetch guild member (if in same server)
        let member = null;
        const guild = interaction?.guild || message?.guild;
        if (guild) {
            member = await guild.members.fetch(user.id).catch(() => null);
        }

        // ✅ Badge mapping
        const badgeMap = {
            HypesquadBalance: "<:HypeSquad_Balance:1378390177558560909>",
            HypesquadBravery: "🦁",
            HypesquadBrilliance: "<:hypesquad_brilliance:1440338416591179927>",
            BugHunterLevel1: "🐛",
            BugHunterLevel2: "🔧",
            VerifiedBot: "<a:Valid_Code_Developer:973845241868193842>",
            Partner: "<:partner:1440339113889890435>",
            EarlySupporter: "🌟",
            ActiveDeveloper: "⚡",
            PremiumEarlySupporter: "💠",
        };

        let badges = "None";
        try {
            const flags = await user.fetchFlags();
            badges = flags.toArray().map(f => badgeMap[f] || f).join(" ") || "None";
        } catch {
            badges = "Unknown";
        }

        // ✅ Roles (only if in server)
        const roles = member
            ? member.roles.cache.filter(r => r.id !== guild.id).map(r => r.toString()).join(", ") || "None"
            : "User not in this server";

        const highestRole = member ? member.roles.highest.toString() : "N/A";

        // ✅ Permissions (only if in server)
        let permissions = "Unavailable (user not in this server)";
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
        const createdAt = `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`;
        const joinedAt = member?.joinedTimestamp ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : "Not in this server";

        // ✅ Boosting
        const boostingSince = member?.premiumSince
            ? `<t:${Math.floor(member.premiumSinceTimestamp / 1000)}:R>`
            : "Not boosting";

        // ✅ Avatars
        const avatarURL = user.displayAvatarURL({ size: 1024, dynamic: true });
        const banner = user.bannerURL({ size: 1024, dynamic: true });
        const serverAvatar = member?.displayAvatarURL({ size: 1024, dynamic: true }) || null;
        const nickname = member?.nickname || "None";

        // ✅ Status & Activities
        let status = "🤞🏻Unavailable";
        let activities = "🌈Unavailable";
        if (member?.presence) {
            status = member.presence.status === "online" ? "🟢 Online"
                : member.presence.status === "idle" ? "🌙 Idle"
                : member.presence.status === "dnd" ? "⛔ Do Not Disturb"
                : "⚫ Offline";
            activities = member.presence.activities.map(a => `${a.type}: ${a.name}`).join("\n") || "None";
        }

        // ✅ Embed
        const embed = new EmbedBuilder()
            .setAuthor({ name: `${user.tag}`, iconURL: avatarURL })
            .setColor("Blue")
            .setThumbnail(serverAvatar || avatarURL)
            .setDescription(`${blueHeart} **User Information**`)
            .addFields(
                { name: "<:SP_monarch:1428421251856076872> Basic Info", value: `> **Username:** ${user.username}\n> **Global Name:** ${user.globalName || "None"}\n> **ID:** ${user.id}\n> **Nickname:** ${nickname}\n> **Bot?:** ${user.bot ? "✅ Yes" : "❌ No"}` },
                { name: "<a:badges:1440332372947243100> Badges", value: badges, inline: false },
                { name: "<a:emoji_28:1440036587596415018> Timestamps", value: `> **Created:** ${createdAt}\n> **Joined:** ${joinedAt}`, inline: false },
                { name: "<:SigmaOk:1440329751662170265> Server Info", value: `> **Highest Role:** ${highestRole}\n> **All Roles:** ${roles}\n> **Boosting Since:** ${boostingSince}`, inline: false },
                { name: "<a:purple_verified:1439271259190988954> Permissions", value: permissions, inline: false },
                { name: "<a:a_online:973845291797213214> Presence", value: `> **Status:** ${status}\n> **Activities:** ${activities}`, inline: false }
            )
            .setFooter({ text: `Requested by ${interaction?.user?.tag || message.author.tag}` })
            .setTimestamp();

        if (banner) embed.setImage(banner);

        // ✅ Reply
        if (interaction) {
            await interaction.reply({ embeds: [embed] });
        } else {
            await message.reply({ embeds: [embed] });
        }
    }
};
