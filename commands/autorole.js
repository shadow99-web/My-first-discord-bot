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

        // 🔧 Safe reply function for both interactions & messages
        const reply = async (content) => {
            if (interaction) {
                const payload = typeof content === "string" ? { content } : content;

                if (interaction.deferred || interaction.replied) {
                    // Already deferred → edit or follow up
                    if (!interaction.replied) {
                        return interaction.editReply(payload).catch(() =>
                            interaction.followUp(payload).catch(() => {})
                        );
                    } else {
                        return interaction.followUp(payload).catch(() => {});
                    }
                } else {
                    // Fresh interaction → reply
                    return interaction.reply({ ...payload, ephemeral: true }).catch(() => {});
                }
            } else if (message) {
                return typeof content === "string"
                    ? message.reply(content).catch(() => {})
                    : message.reply(content).catch(() => {});
            }
        };

        const sendEmbed = (title, description, color = "Blue") =>
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
            if (!role) return reply("❌ Please mention a role.");
            await addAutorole(guildId, "humans", role.id);
            return reply({ embeds: [sendEmbed("Autorole Updated", `Added **${role.name}** to humans.`)] });
        }

        // --- HUMANS REMOVE ---
        if (group === "humans" && sub === "remove") {
            if (!role) return reply("❌ Please mention a role.");
            await removeAutorole(guildId, "humans", role.id);
            return reply({ embeds: [sendEmbed("Autorole Updated", `Removed **${role.name}** from humans.`)] });
        }

        // --- BOTS ADD ---
        if (group === "bots" && sub === "add") {
            if (!role) return reply("❌ Please mention a role.");
            await addAutorole(guildId, "bots", role.id);
            return reply({ embeds: [sendEmbed("Autorole Updated", `Added **${role.name}** to bots.`)] });
        }

        // --- BOTS REMOVE ---
        if (group === "bots" && sub === "remove") {
            if (!role) return reply("❌ Please mention a role.");
            await removeAutorole(guildId, "bots", role.id);
            return reply({ embeds: [sendEmbed("Autorole Updated", `Removed **${role.name}** from bots.`)] });
        }

        // --- CONFIG ---
        if (sub === "config") {
            const config = await getAutorole(guildId);
            const humans = config.humans.map(r => `<@&${r}>`).join(", ") || "None";
            const bots = config.bots.map(r => `<@&${r}>`).join(", ") || "None";
            return reply({ embeds: [sendEmbed("Autorole Config", `👤 Humans: ${humans}\n🤖 Bots: ${bots}`, "Yellow")] });
        }

        // --- RESET ---
        if (sub === "reset") {
            await resetAutorole(guildId);
            return reply({ embeds: [sendEmbed("Autorole Reset", "All autorole settings have been reset.", "Red")] });
        }

        return reply("❌ Invalid usage. Use `humans`, `bots`, `config`, or `reset`.");
    }
};
