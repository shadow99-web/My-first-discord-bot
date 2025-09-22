// commands/bulkCreateRole.js
const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require("discord.js");

// Role templates
const templates = {
    stars: (name) => `╰›。⭐┆${name}┆⭐`,
    hearts: (name) => `╰›。💙┆${name}┆💙`,
    mystic: (name) => `╰›。🜲┆${name}┆🜲`,
    plain: (name) => name
};

// 🎨 Random role color
function randomColor() {
    return Math.floor(Math.random() * 0xFFFFFF);
}

// Predefined perms to select from (safe set)
const PERM_CHOICES = [
    { name: "Administrator", value: "Administrator" },
    { name: "Manage Roles", value: "ManageRoles" },
    { name: "Manage Channels", value: "ManageChannels" },
    { name: "Kick Members", value: "KickMembers" },
    { name: "Ban Members", value: "BanMembers" },
    { name: "Manage Messages", value: "ManageMessages" },
    { name: "Mention Everyone", value: "MentionEveryone" },
    { name: "Mute Members", value: "MuteMembers" },
    { name: "Deafen Members", value: "DeafenMembers" },
    { name: "Move Members", value: "MoveMembers" },
];

module.exports = {
    name: "bulkcreaterole",
    description: "Create multiple roles at once with templates, colors, and permissions",
    usage: "!bulkcreaterole <role1, role2, role3> [template] [--perms=PERM1,PERM2]",
    data: new SlashCommandBuilder()
        .setName("bulkcreaterole")
        .setDescription("Create multiple roles at once (comma-separated)")
        .addStringOption(opt =>
            opt.setName("roles")
                .setDescription("Comma-separated list of role names (e.g. Admin, Mod, Member)")
                .setRequired(true)
        )
        .addStringOption(opt =>
            opt.setName("template")
                .setDescription("Choose a role style")
                .addChoices(
                    { name: "⭐ Stars", value: "stars" },
                    { name: "💙 Hearts", value: "hearts" },
                    { name: "🜲 Mystic", value: "mystic" },
                    { name: "Plain", value: "plain" }
                )
        )
        .addStringOption(opt =>
            opt.setName("permissions")
                .setDescription("Comma-separated permissions (e.g. KickMembers,BanMembers)")
                .setRequired(false)
        ),

    // ========= Slash Command =========
    async execute(interaction) {
        if (!interaction.guild) return interaction.reply({ content: "❌ This can only be used in a server.", ephemeral: true });

        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
            return interaction.reply({ content: "❌ You don’t have permission to manage roles.", ephemeral: true });
        }

        const rolesInput = interaction.options.getString("roles");
        const template = interaction.options.getString("template") || "plain";
        const permsInput = interaction.options.getString("permissions");

        // Parse perms
        let perms = [];
        if (permsInput) {
            perms = permsInput.split(",").map(p => p.trim()).filter(p => PermissionsBitField.Flags[p]);
        }

        const roleNames = rolesInput.split(",").map(r => r.trim()).filter(r => r.length > 0);
        if (roleNames.length === 0) {
            return interaction.reply({ content: "⚠️ Provide at least one role name.", ephemeral: true });
        }

        const created = [];
        const failed = [];

        for (const name of roleNames) {
            const roleName = templates[template](name);
            try {
                const role = await interaction.guild.roles.create({
                    name: roleName,
                    color: randomColor(),
                    permissions: perms, // ✅ apply chosen perms
                    reason: `Bulk role creation by ${interaction.user.tag}`,
                });
                created.push(role.toString());
            } catch (err) {
                console.warn(`❌ Failed to create role ${name}:`, err.message);
                failed.push(roleName);
            }
        }

        const embed = new EmbedBuilder()
            .setColor("Blue")
            .setTitle("💙 Bulk Role Creation")
            .addFields(
                { name: "✅ Created", value: created.length > 0 ? created.join(", ") : "None" },
                { name: "❌ Failed", value: failed.length > 0 ? failed.join(", ") : "None" },
                { name: "🔑 Permissions", value: perms.length > 0 ? perms.join(", ") : "None" }
            )
            .setFooter({ text: `Requested by ${interaction.user.tag}` });

        return interaction.reply({ embeds: [embed] });
    },

    // ========= Prefix Command =========
    async prefixExecute(message, args) {
        if (!message.guild) return;

        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
            return message.reply("❌ You don’t have permission to manage roles.");
        }

        if (args.length === 0) {
            return message.reply("⚠️ Usage: `!bulkcreaterole <role1, role2, role3> [--template] [--perms=PERM1,PERM2]`");
        }

        let template = "plain";
        let perms = [];

        // Extract flags
        args = args.filter(arg => {
            if (arg.startsWith("--template=")) {
                const t = arg.replace("--template=", "");
                if (templates[t]) template = t;
                return false;
            }
            if (arg.startsWith("--perms=")) {
                const pList = arg.replace("--perms=", "").split(",");
                perms = pList.map(p => p.trim()).filter(p => PermissionsBitField.Flags[p]);
                return false;
            }
            return true;
        });

        const roleNames = args.join(" ").split(",").map(r => r.trim()).filter(r => r.length > 0);

        const created = [];
        const failed = [];

        for (const name of roleNames) {
            const roleName = templates[template](name);
            try {
                const role = await message.guild.roles.create({
                    name: roleName,
                    color: randomColor(),
                    permissions: perms,
                    reason: `Bulk role creation by ${message.author.tag}`,
                });
                created.push(role.toString());
            } catch (err) {
                console.warn(`❌ Failed to create role ${name}:`, err.message);
                failed.push(roleName);
            }
        }

        const embed = new EmbedBuilder()
            .setColor("Blue")
            .setTitle("💙 Bulk Role Creation")
            .addFields(
                { name: "✅ Created", value: created.length > 0 ? created.join(", ") : "None" },
                { name: "❌ Failed", value: failed.length > 0 ? failed.join(", ") : "None" },
                { name: "🔑 Permissions", value: perms.length > 0 ? perms.join(", ") : "None" }
            )
            .setFooter({ text: `Requested by ${message.author.tag}` });

        return message.reply({ embeds: [embed] });
    }
};
