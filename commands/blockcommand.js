const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");

// ===== PUT YOUR DISCORD ID HERE =====
const DEVELOPER_ID = "1378954077462986772";

module.exports = {
    data: new SlashCommandBuilder()
        .setName("blockcommand")
        .setDescription("Block a user from using a specific command")
        .addUserOption(option =>
            option.setName("user")
                .setDescription("The user to block")
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName("command")
                .setDescription("The command to block")
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild), // only admins/mods

    async execute({ interaction, client }) {
        const target = interaction.options.getUser("user");
        const commandName = interaction.options.getString("command").toLowerCase();

        // ===== Prevent blocking the developer (except by themselves) =====
        if (target.id === DEVELOPER_ID && interaction.user.id !== DEVELOPER_ID) {
            return interaction.reply({
                content: "❌ You cannot block the developer of this bot!",
                ephemeral: true
            });
        }

        // Initialize storage
        if (!client.blockedCommands) client.blockedCommands = new Map();
        if (!client.blockedCommands.has(interaction.guild.id)) {
            client.blockedCommands.set(interaction.guild.id, new Map());
        }

        const guildBlocks = client.blockedCommands.get(interaction.guild.id);

        if (!guildBlocks.has(target.id)) {
            guildBlocks.set(target.id, new Set());
        }

        guildBlocks.get(target.id).add(commandName);

        const embed = new EmbedBuilder()
            .setColor("Red")
            .setTitle("🚫 Command Blocked")
            .setDescription(`**${target.tag}** has been blocked from using \`${commandName}\`.`)
            .setFooter({ text: `Action by ${interaction.user.tag}` })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
