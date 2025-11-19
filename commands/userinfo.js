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

    async execute(ctx) {
        const { interaction, message, client, args } = ctx;
        const isPrefix = !!message;

        // -------------------------------------------
        // ⚠️ FIX 1: Prevent Unknown Interaction
        // -------------------------------------------
        if (interaction) {
            if (!interaction.deferred && !interaction.replied) {
                await interaction.deferReply({ flags: 64 }).catch(() => {});
            }
        }

        let user = null;

        // ---------------------- INPUT ---------------------
        let input;
        if (interaction) {
            input = interaction.options.getUser("target") || interaction.options.getString("userid");
        } else {
            input = message.mentions.users.first() || args[0];
        }

        try {
            if (!input) {
                user = interaction ? interaction.user : message.author;
            } else if (typeof input === "object" && input.id) {
                user = await client.users.fetch(input.id, { force: true });
            } else if (/^\d{17,19}$/.test(input)) {
                user = await client.users.fetch(input, { force: true });
            } else {
                user = interaction ? interaction.user : message.author;
            }
        } catch {
            const errorMsg = "❌ Unable to find that user. Make sure the ID is valid.";

            if (interaction) {
                return interaction.editReply({ content: errorMsg });
            } else {
                return message.reply(errorMsg);
            }
        }

        // ---------------------- MEMBER FETCH ---------------------
        let member = null;
        const guild = interaction?.guild || message?.guild;

        if (guild) {
            member = await guild.members.fetch(user.id).catch(() => null);
        }

        // ---------------------- BADGES ---------------------
        const badgeMap = {
            HypesquadBalance: "<:Hypesquad_Balance:1440334570217017465>",
            HypesquadBravery: "<a:A_HypeSquadB:1440382638719369266>",
            HypesquadBrilliance: "<:hypesquad_brilliance:1440338416591179927>",
            BugHunterLevel1: "<:bug_green:1440384254419927193>",
            BugHunterLevel2: "<:bug_gold:1440384270219874389>",
            VerifiedBot: "<a:Valid_Code_Developer:1440333673449783326>",
            Partner: "<:partner:1440339113889890435>",
            EarlySupporter: "<a:nitrowumpus:1440383559419428966>",
            ActiveDeveloper: "<:activedev:1440374453942091879>",
            PremiumEarlySupporter: "<a:nitrowumpus:1440383559419428966>"
        };

        let badges = "None";
        try {
            const flags = await user.fetchFlags();
            badges = flags.toArray().map(f => badgeMap[f] || f).join(" ") || "None";
        } catch {
            badges = "Unknown";
        }

        // ---------------------- ROLES ---------------------
        const roles = member
            ? member.roles.cache.filter(r => r.id !== guild.id).map(r => r.toString()).join(", ") || "None"
            : "User not in this server";

        const highestRole = member ? member.roles.highest.toString() : "N/A";

        // ---------------------- PERMISSIONS ---------------------
        let permissions = "Unavailable (user not in this server)";
        if (member) {
            const perms = [];
            if (member.permissions.has(PermissionsBitField.Flags.Administrator)) perms.push("<:Staff:1430436159678320762> Administrator");
            if (member.permissions.has(PermissionsBitField.Flags.ManageGuild)) perms.push("<a:config:1440375326743204032> Manage Server");
            if (member.permissions.has(PermissionsBitField.Flags.ManageRoles)) perms.push("🎭 Manage Roles");
            if (member.permissions.has(PermissionsBitField.Flags.ManageChannels)) perms.push("📺 Manage Channels");
            if (member.permissions.has(PermissionsBitField.Flags.BanMembers)) perms.push("🔨 Ban Members");

            permissions = perms.length ? perms.join(", ") : "No special permissions";
        }

        // ---------------------- TIMESTAMPS ---------------------
        const createdAt = `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`;
        const joinedAt = member?.joinedTimestamp
            ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`
            : "Not in this server";

        const boostingSince = member?.premiumSince
            ? `<t:${Math.floor(member.premiumSinceTimestamp / 1000)}:R>`
            : "Not boosting";

        // ---------------------- AVATARS ---------------------
        const avatarURL = user.displayAvatarURL({ size: 1024, dynamic: true });
        const banner = user.bannerURL({ size: 1024, dynamic: true });
        const serverAvatar = member?.displayAvatarURL({ size: 1024, dynamic: true }) || null;

        const nickname = member?.nickname || "None";

        // ---------------------- STATUS ---------------------
        let status = "🤞🏻Unavailable";
        let activities = "🌈Unavailable";

        if (member?.presence) {
            status = {
                online: "🟢 Online",
                idle: "🌙 Idle",
                dnd: "⛔ Do Not Disturb"
            }[member.presence.status] || "⚫ Offline";

            activities =
                member.presence.activities.map(a => `${a.type}: ${a.name}`).join("\n") || "None";
        }

        // ---------------------- EMBED ---------------------
        const embed = new EmbedBuilder()
            .setAuthor({ name: user.tag, iconURL: avatarURL })
            .setColor("Blue")
            .setThumbnail(serverAvatar || avatarURL)
            .setDescription(`${blueHeart} **User Information**`)
            .addFields(
                {
                    name: "<:SP_monarch:1428421251856076872> Basic Info",
                    value:
                        `> **Username:** ${user.username}\n` +
                        `> **Global Name:** ${user.globalName || "None"}\n` +
                        `> **ID:** ${user.id}\n` +
                        `> **Nickname:** ${nickname}\n` +
                        `> **Bot?:** ${user.bot ? "✅ Yes" : "❌ No"}`
                },
                { name: "<a:badges:1440332372947243100> Badges", value: badges },
                {
                    name: "<a:emoji_28:1440036587596415018> Timestamps",
                    value: `> **Created:** ${createdAt}\n> **Joined:** ${joinedAt}`
                },
                {
                    name: "<:SigmaOk:1440329751662170265> Server Info",
                    value:
                        `> **Highest Role:** ${highestRole}\n` +
                        `> **All Roles:** ${roles}\n` +
                        `> **Boosting:** ${boostingSince}`
                },
                { name: "<a:purple_verified:1439271259190988954> Permissions", value: permissions },
                {
                    name: "<a:a_online:1440333669863522485> Presence",
                    value: `> **Status:** ${status}\n> **Activities:** ${activities}`
                }
            )
            .setFooter({ text: `Requested by ${interaction?.user?.tag || message.author.tag}` })
            .setTimestamp();

        if (banner) embed.setImage(banner);

        // ---------------------- SAFE REPLY ---------------------
        if (interaction) {
            return interaction.editReply({ embeds: [embed] }).catch(() => {});
        } else {
            return message.reply({ embeds: [embed] });
        }
    }
};
