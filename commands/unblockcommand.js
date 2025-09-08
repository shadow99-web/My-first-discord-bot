const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");

// ===== PUT YOUR DISCORD ID HERE =====
const DEVELOPER_ID = "1378954077462986772";

module.exports = {
    data: new SlashCommandBuilder()
        .setName("unblockcommand")
        .setDescription("Unblock a user for a specific command")
        .addUserOption(option =>
            option.setName("user")
                .setDescription("The user to unblock")
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName("command")
                .setDescription("The command to unblock")
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild), // only admins/mods

    async execute({ interaction, client }) {
        const target = interaction.options.getUser("user");
        const commandName = interaction.options.getString("command").toLowerCase();

        // Initialize storage
        if (!client.blockedCommands) client.blockedCommands = new Map();
        if (!client.blockedCommands.has(interaction.guild.id)) {
            client.blockedCommands.set(interaction.guild.id, new Map());
        }

        const guildBlocks = client.blockedCommands.get(interaction.guild.id);

        if (guildBlocks.has(target.id) && guildBlocks.get(target.id).has(commandName)) {
            guildBlocks.get(target.id).delete(commandName);

            const embed = new EmbedBuilder()
                .setColor("Green")
                .setTitle("✅ Command Unblocked")
                .setDescription(`**${target.tag}** can now use \`${commandName}\`.`)
                .setFooter({ text: `Action by ${interaction.user.tag}` })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } else {
            await interaction.reply({
                content: `⚠️ ${target.tag} was not blocked from \`${commandName}\`.`,
                ephemeral: true
            });
        }
    }
};
