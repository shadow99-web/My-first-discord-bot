const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const { getAutorole, addAutorole, removeAutorole, resetAutorole } = require("../Handlers/autoroleHandler");

const blueHeart = "<a:blue_heart:1414309560231002194>";

module.exports = {
    data: new SlashCommandBuilder()
        .setName("autorole")
        .setDescription("Manage automatic role assignment")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommandGroup(group =>
            group.setName("humans")
                .setDescription("Manage autoroles for humans")
                .addSubcommand(cmd =>
                    cmd.setName("add")
                        .setDescription("Add an autorole for humans")
                        .addRoleOption(opt =>
                            opt.setName("role").setDescription("Role to assign").setRequired(true)
                        )
                )
                .addSubcommand(cmd =>
                    cmd.setName("remove")
                        .setDescription("Remove autorole for humans")
                        .addRoleOption(opt =>
                            opt.setName("role").setDescription("Role to remove").setRequired(true)
                        )
                )
        )
        .addSubcommandGroup(group =>
            group.setName("bots")
                .setDescription("Manage autoroles for bots")
                .addSubcommand(cmd =>
                    cmd.setName("add")
                        .setDescription("Add an autorole for bots")
                        .addRoleOption(opt =>
                            opt.setName("role").setDescription("Role to assign").setRequired(true)
                        )
                )
                .addSubcommand(cmd =>
                    cmd.setName("remove")
                        .setDescription("Remove autorole for bots")
                        .addRoleOption(opt =>
                            opt.setName("role").setDescription("Role to remove").setRequired(true)
                        )
                )
        )
        .addSubcommand(cmd => cmd.setName("config").setDescription("View autorole configuration"))
        .addSubcommand(cmd => cmd.setName("reset").setDescription("Reset autorole configuration")),

    async execute({ interaction, message, client }) {
        const guildId = interaction?.guildId || message.guild.id;
        const user = interaction?.user || message.author;

        // 🔧 Universal reply (slash uses editReply, prefix uses reply)
        const sendReply = async (payload) => {
            if (interaction) {
                const data = typeof payload === "string" ? { content: payload } : payload;
                // Interaction already deferred in interaction.js
                return interaction.editReply(data).catch(() =>
                    interaction.followUp({ ...data, ephemeral: true }).catch(() => {})
                );
            } else if (message) {
                return typeof payload === "string"
                    ? message.reply(payload).catch(() => {})
                    : message.reply(payload).catch(() => {});
            }
        };

        const makeEmbed = (title, description, color = "Blue") =>
            new EmbedBuilder()
                .setColor(color)
                .setAuthor({ name: title, iconURL: client.user.displayAvatarURL() })
                .setDescription(`${blueHeart} ${description}`)
                .setFooter({ text: `Requested by ${user.tag}` })
                .setTimestamp();

        let group, sub, role;
        if (interaction) {
            group = interaction.options.getSubcommandGroup(false);
            sub = interaction.options.getSubcommand();
            role = interaction.options.getRole("role");
        } else if (message) {
            // Example: !autorole humans add @role
            const args = message.content.trim().split(/\s+/).slice(1);
            group = args.shift()?.toLowerCase();
            sub = args.shift()?.toLowerCase();
            role = message.mentions.roles.first();
        }

        // --- HUMANS ADD ---
        if (group === "humans" && sub === "add") {
            if (!role) return sendReply("❌ Please mention a role.");
            await addAutorole(guildId, "humans", role.id);
            return sendReply({ embeds: [makeEmbed("Autorole Updated", `Added **${role.name}** to humans.`)] });
        }

        // --- HUMANS REMOVE ---
        if (group === "humans" && sub === "remove") {
            if (!role) return sendReply("❌ Please mention a role.");
            await removeAutorole(guildId, "humans", role.id);
            return sendReply({ embeds: [makeEmbed("Autorole Updated", `Removed **${role.name}** from humans.`)] });
        }

        // --- BOTS ADD ---
        if (group === "bots" && sub === "add") {
            if (!role) return sendReply("❌ Please mention a role.");
            await addAutorole(guildId, "bots", role.id);
            return sendReply({ embeds: [makeEmbed("Autorole Updated", `Added **${role.name}** to bots.`)] });
        }

        // --- BOTS REMOVE ---
        if (group === "bots" && sub === "remove") {
            if (!role) return sendReply("❌ Please mention a role.");
            await removeAutorole(guildId, "bots", role.id);
            return sendReply({ embeds: [makeEmbed("Autorole Updated", `Removed **${role.name}** from bots.`)] });
        }

        // --- CONFIG ---
        if (sub === "config") {
            const config = await getAutorole(guildId);
            const humans = config.humans.map(r => `<@&${r}>`).join(", ") || "None";
            const bots = config.bots.map(r => `<@&${r}>`).join(", ") || "None";
            return sendReply({ embeds: [makeEmbed("Autorole Config", `👤 Humans: ${humans}\n🤖 Bots: ${bots}`, "Yellow")] });
        }

        // --- RESET ---
        if (sub === "reset") {
            await resetAutorole(guildId);
            return sendReply({ embeds: [makeEmbed("Autorole Reset", "All autorole settings have been reset.", "Red")] });
        }

        return sendReply("❌ Invalid usage. Use `humans`, `bots`, `config`, or `reset`.");
    }
};
