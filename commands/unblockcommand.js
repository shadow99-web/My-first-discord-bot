const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("unblockcommand")
        .setDescription("Unblock a user so they can use a specific command again")
        .addUserOption(opt =>
            opt.setName("user").setDescription("User to unblock").setRequired(true)
        )
        .addStringOption(opt =>
            opt.setName("command").setDescription("Command to unblock").setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute({ interaction, client }) {
        const target = interaction.options.getUser("user");
        const commandName = interaction.options.getString("command").toLowerCase();
        const guildId = interaction.guild.id;
        const blueHeart = "<a:blue_heart_1414309560231002194:1414309560231002194>";

        // 🚫 Prevent trying to "unblock" the developer (not needed but safe)
        if (target.id === process.env.DEV_ID) {
            const embed = new EmbedBuilder()
                .setColor("Red")
                .setTitle(`${blueHeart} Action Denied`)
                .setDescription(`⚡ **${target.tag}** is the **Bot Developer** and was never blockable.`)
                .setFooter({ text: "Respect the creator ✨" })
                .setTimestamp();

            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        // ✅ Normal unblocking
        if (!client.blockedCommands.has(guildId)) {
            return interaction.reply({
                content: `❌ No blocked commands found for this server.`,
                ephemeral: true
            });
        }

        const guildBlocks = client.blockedCommands.get(guildId);
        if (!guildBlocks[commandName]) {
            return interaction.reply({
                content: `❌ No users are blocked from \`${commandName}\` in this server.`,
                ephemeral: true
            });
        }

        // Remove user if they exist in blocklist
        const index = guildBlocks[commandName].indexOf(target.id);
        if (index === -1) {
            return interaction.reply({
                content: `❌ **${target.tag}** was not blocked from \`${commandName}\`.`,
                ephemeral: true
            });
        }

        guildBlocks[commandName].splice(index, 1);

        const embed = new EmbedBuilder()
            .setColor("Green")
            .setTitle(`${blueHeart} Command Unblocked`)
            .setDescription(
                `✅ **${target.tag}** is now unblocked and can use \`${commandName}\` again in this server.`
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
