// commands/bulkCreateRole.js
const { 
    SlashCommandBuilder, 
    PermissionFlagsBits, 
    EmbedBuilder 
} = require("discord.js");

const templates = {
    none: (name) => name,
    fancy1: (name) => `╰›。🜲┆${name}┆🜲`,
    fancy2: (name) => `✧･ﾟ: *✧ ${name} ✧*:･ﾟ✧`,
    fancy3: (name) => `⟡₊ ${name} ₊⟡`,
};

module.exports = {
    name: "bulkcreaterole",
    description: "Create multiple roles in bulk with optional permissions & templates",
    data: new SlashCommandBuilder()
        .setName("bulkcreaterole")
        .setDescription("Create multiple roles in bulk with optional permissions & templates")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
        .addStringOption(option =>
            option.setName("roles")
                .setDescription("Comma-separated list of roles to create")
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName("perms")
                .setDescription("Select one or more permissions (comma separated)")
                .setRequired(false)
                .addChoices(
                    { name: "Administrator", value: "Administrator" },
                    { name: "Manage Channels", value: "ManageChannels" },
                    { name: "Manage Roles", value: "ManageRoles" },
                    { name: "Send Messages", value: "SendMessages" },
                    { name: "Ban Members", value: "BanMembers" },
                    { name: "Kick Members", value: "KickMembers" },
                    { name: "Mute Members", value: "MuteMembers" }
                )
        )
        .addStringOption(option =>
            option.setName("template")
                .setDescription("Choose a role template style")
                .setRequired(false)
                .addChoices(
                    { name: "None", value: "none" },
                    { name: "Fancy Style 1", value: "fancy1" },
                    { name: "Fancy Style 2", value: "fancy2" },
                    { name: "Fancy Style 3", value: "fancy3" }
                )
        ),

    async execute(ctx) {
        const isInteraction = typeof ctx.isChatInputCommand === "function";
        const guild = ctx.guild;

        // 🔒 Permission check
        if (!ctx.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
            const reply = "❌ You don’t have permission to manage roles.";
            return isInteraction 
                ? ctx.reply({ content: reply, ephemeral: true }) 
                : ctx.channel.send(reply);
        }

        // 📌 Inputs
        const rolesInput = isInteraction 
            ? ctx.options.getString("roles") 
            : ctx.args.join(" ");

        const permsInput = isInteraction 
            ? ctx.options.getString("perms") 
            : null;

        const templateChoice = isInteraction
            ? (ctx.options.getString("template") || "none")
            : (ctx.args.includes("--template=fancy1") ? "fancy1" :
               ctx.args.includes("--template=fancy2") ? "fancy2" :
               ctx.args.includes("--template=fancy3") ? "fancy3" : "none");

        if (!rolesInput) {
            const reply = "❌ Please provide roles separated by commas.";
            return isInteraction 
                ? ctx.reply({ content: reply, ephemeral: true }) 
                : ctx.channel.send(reply);
        }

        const roles = rolesInput.split(",").map(r => r.trim()).filter(Boolean);
        const permissions = permsInput 
            ? permsInput.split(",").map(p => p.trim()) 
            : [];

        // ✅ Role creation
        const createdRoles = [];
        for (const roleName of roles) {
            try {
                const formattedName = templates[templateChoice](roleName);
                const role = await guild.roles.create({
                    name: formattedName,
                    permissions: permissions,
                    reason: "Bulk role creation with template",
                });
                createdRoles.push(role.toString());
            } catch (err) {
                console.error(`❌ Failed to create role ${roleName}:`, err);
            }
        }

        // 💙 Blue Heart Embed
        const blueHeart = "<a:blue_heart:1414309560231002194>";
        const embed = new EmbedBuilder()
            .setColor("Blue")
            .setTitle(`${blueHeart} Bulk Role Creation`)
            .setDescription(
                createdRoles.length > 0
                    ? `✅ Created roles:\n${createdRoles.join("\n")}`
                    : "❌ No roles could be created."
            )
            .setFooter({ text: `Template: ${templateChoice}` })
            .setTimestamp();

        return isInteraction 
            ? ctx.reply({ embeds: [embed] }) 
            : ctx.channel.send({ embeds: [embed] });
    },
};
