const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const { setReactionRole, removeReactionRole, resetReactionRoles, getReactionRoles } = require("../Handlers/reactionRoleHandler");

const blueHeart = "<a:blue_heart:1414309560231002194>";

module.exports = {
    data: new SlashCommandBuilder()
        .setName("reactionrole")
        .setDescription("Manage reaction roles")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
        .addSubcommand(cmd =>
            cmd.setName("add")
                .setDescription("Add a reaction role")
                .addStringOption(opt =>
                    opt.setName("messageid").setDescription("ID of the message").setRequired(true)
                )
                .addStringOption(opt =>
                    opt.setName("emoji").setDescription("Emoji to use").setRequired(true)
                )
                .addRoleOption(opt =>
                    opt.setName("role").setDescription("Role to assign").setRequired(true)
                )
        )
        .addSubcommand(cmd =>
            cmd.setName("edit")
                .setDescription("Edit a reaction role")
                .addStringOption(opt =>
                    opt.setName("messageid").setDescription("ID of the message").setRequired(true)
                )
                .addStringOption(opt =>
                    opt.setName("emoji").setDescription("Emoji to change").setRequired(true)
                )
                .addRoleOption(opt =>
                    opt.setName("role").setDescription("New role").setRequired(true)
                )
        )
        .addSubcommand(cmd =>
            cmd.setName("remove")
                .setDescription("Remove a reaction role")
                .addStringOption(opt =>
                    opt.setName("messageid").setDescription("ID of the message").setRequired(true)
                )
                .addStringOption(opt =>
                    opt.setName("emoji").setDescription("Emoji to remove").setRequired(true)
                )
        )
        .addSubcommand(cmd =>
            cmd.setName("reset")
                .setDescription("Reset all reaction roles on a message")
                .addStringOption(opt =>
                    opt.setName("messageid").setDescription("ID of the message").setRequired(true)
                )
        )
        .addSubcommand(cmd =>
            cmd.setName("config")
                .setDescription("View reaction role config")
                .addStringOption(opt =>
                    opt.setName("messageid").setDescription("ID of the message").setRequired(true)
                )
        ),

    async execute({ interaction, message, client }) {
        const guildId = interaction?.guildId || message.guild.id;
        const user = interaction?.user || message.author;

        // ✅ Safe reply
        const reply = async (content) => {
            if (interaction) {
                if (interaction.replied || interaction.deferred) {
                    return interaction.followUp({ ...content, ephemeral: true }).catch(() => {});
                }
                return interaction.reply({ ...content, ephemeral: true }).catch(() => {});
            } else if (message) {
                return message.reply(content).catch(() => {});
            }
        };

        const sendEmbed = (title, desc, color = "Blue") =>
            new EmbedBuilder()
                .setColor(color)
                .setAuthor({ name: title, iconURL: client.user.displayAvatarURL() })
                .setDescription(`${blueHeart} ${desc}`)
                .setFooter({ text: `Requested by ${user.tag}` })
                .setTimestamp();

        // Extract args
        let sub, messageId, emoji, role;
        if (interaction) {
            sub = interaction.options.getSubcommand();
            messageId = interaction.options.getString("messageid");
            emoji = interaction.options.getString("emoji");
            role = interaction.options.getRole("role");
        } else if (message) {
            // Example: !reactionrole add <messageId> 😀 @role
            const args = message.content.trim().split(/\s+/).slice(1);
            sub = args.shift()?.toLowerCase();
            messageId = args.shift();
            emoji = args.shift();
            role = message.mentions.roles.first();
        }

        // --- ADD ---
        if (sub === "add") {
            if (!messageId || !emoji || !role) return reply("❌ Usage: add <messageId> <emoji> <@role>");
            await setReactionRole(guildId, messageId, emoji, role.id);

            return reply({ embeds: [sendEmbed("Reaction Role Added", `Emoji ${emoji} → ${role}`)] });
        }

        // --- EDIT ---
        if (sub === "edit") {
            if (!messageId || !emoji || !role) return reply("❌ Usage: edit <messageId> <emoji> <@role>");
            await setReactionRole(guildId, messageId, emoji, role.id);

            return reply({ embeds: [sendEmbed("Reaction Role Updated", `Emoji ${emoji} is now bound to ${role}`)] });
        }

        // --- REMOVE ---
        if (sub === "remove") {
            if (!messageId || !emoji) return reply("❌ Usage: remove <messageId> <emoji>");
            await removeReactionRole(guildId, messageId, emoji);

            return reply({ embeds: [sendEmbed("Reaction Role Removed", `Removed emoji ${emoji}`)] });
        }

        // --- RESET ---
        if (sub === "reset") {
            if (!messageId) return reply("❌ Usage: reset <messageId>");
            await resetReactionRoles(guildId, messageId);

            return reply({ embeds: [sendEmbed("Reaction Roles Reset", `Cleared all roles for message ${messageId}`, "Red")] });
        }

        // --- CONFIG ---
        if (sub === "config") {
            if (!messageId) return reply("❌ Usage: config <messageId>");
            const roles = await getReactionRoles(guildId, messageId);

            const lines = Object.entries(roles).map(([em, roleId]) => `${em} → <@&${roleId}>`);
            return reply({
                embeds: [
                    sendEmbed("Reaction Role Config", lines.length ? lines.join("\n") : "No roles set.", "Yellow")
                ]
            });
        }

        return reply("❌ Invalid usage. Use `add`, `edit`, `remove`, `reset`, or `config`.");
    }
};
