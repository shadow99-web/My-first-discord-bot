const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const fs = require("fs");

const autoroleFile = "./autorole.json";
if (!fs.existsSync(autoroleFile)) fs.writeFileSync(autoroleFile, "{}");

const getAutorole = () => JSON.parse(fs.readFileSync(autoroleFile, "utf8"));
const saveAutorole = (data) => fs.writeFileSync(autoroleFile, JSON.stringify(data, null, 4));

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
                            opt.setName("role")
                                .setDescription("Role to assign")
                                .setRequired(true)
                        )
                )
                .addSubcommand(cmd =>
                    cmd.setName("remove")
                        .setDescription("Remove autorole for humans")
                        .addRoleOption(opt =>
                            opt.setName("role")
                                .setDescription("Role to remove")
                                .setRequired(true)
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
                            opt.setName("role")
                                .setDescription("Role to assign")
                                .setRequired(true)
                        )
                )
                .addSubcommand(cmd =>
                    cmd.setName("remove")
                        .setDescription("Remove autorole for bots")
                        .addRoleOption(opt =>
                            opt.setName("role")
                                .setDescription("Role to remove")
                                .setRequired(true)
                        )
                )
        )
        .addSubcommand(cmd =>
            cmd.setName("config")
                .setDescription("View autorole configuration")
        )
        .addSubcommand(cmd =>
            cmd.setName("reset")
                .setDescription("Reset autorole configuration")
        ),

    async execute({ interaction, isPrefix, message, args, client }) {
        const guildId = interaction ? interaction.guild.id : message.guild.id;
        const autorole = getAutorole();
        if (!autorole[guildId]) autorole[guildId] = { humans: [], bots: [] };

        const sendEmbed = (title, description, color = "Blue") => {
            const embed = new EmbedBuilder()
                .setColor(color)
                .setAuthor({ name: title, iconURL: client.user.displayAvatarURL() })
                .setDescription(`${blueHeart} ${description}`)
                .setTimestamp();
            return embed;
        };

        if (interaction) {
            const group = interaction.options.getSubcommandGroup(false);
            const sub = interaction.options.getSubcommand();

            if (group === "humans" && sub === "add") {
                const role = interaction.options.getRole("role");
                if (!autorole[guildId].humans.includes(role.id)) {
                    autorole[guildId].humans.push(role.id);
                    saveAutorole(autorole);
                }
                return interaction.reply({ embeds: [sendEmbed("Autorole Updated", `Added **${role.name}** to humans.`)] });
            }

            if (group === "humans" && sub === "remove") {
                const role = interaction.options.getRole("role");
                autorole[guildId].humans = autorole[guildId].humans.filter(r => r !== role.id);
                saveAutorole(autorole);
                return interaction.reply({ embeds: [sendEmbed("Autorole Updated", `Removed **${role.name}** from humans.`)] });
            }

            if (group === "bots" && sub === "add") {
                const role = interaction.options.getRole("role");
                if (!autorole[guildId].bots.includes(role.id)) {
                    autorole[guildId].bots.push(role.id);
                    saveAutorole(autorole);
                }
                return interaction.reply({ embeds: [sendEmbed("Autorole Updated", `Added **${role.name}** to bots.`)] });
            }

            if (group === "bots" && sub === "remove") {
                const role = interaction.options.getRole("role");
                autorole[guildId].bots = autorole[guildId].bots.filter(r => r !== role.id);
                saveAutorole(autorole);
                return interaction.reply({ embeds: [sendEmbed("Autorole Updated", `Removed **${role.name}** from bots.`)] });
            }

            if (interaction.commandName === "autorole" && sub === "config") {
                const humans = autorole[guildId].humans.map(r => `<@&${r}>`).join(", ") || "None";
                const bots = autorole[guildId].bots.map(r => `<@&${r}>`).join(", ") || "None";
                return interaction.reply({
                    embeds: [
                        sendEmbed("Autorole Config", `👤 Humans: ${humans}\n🤖 Bots: ${bots}`, "Yellow")
                    ]
                });
            }

            if (interaction.commandName === "autorole" && sub === "reset") {
                autorole[guildId] = { humans: [], bots: [] };
                saveAutorole(autorole);
                return interaction.reply({ embeds: [sendEmbed("Autorole Reset", "All autorole settings have been reset.", "Red")] });
            }
        }
    }
};
