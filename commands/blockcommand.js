const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("blockcommand")
        .setDescription("Block a user from using a specific command")
        .addUserOption(opt =>
            opt.setName("user").setDescription("User to block").setRequired(true)
        )
        .addStringOption(opt =>
            opt.setName("command").setDescription("Command to block").setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute({ interaction, client }) {
        const target = interaction.options.getUser("user");
        const commandName = interaction.options.getString("command").toLowerCase();
        const guildId = interaction.guild.id;
        const blueHeart = "<a:blue_heart_1414309560231002194:1414309560231002194>";

        // 🚫 Prevent blocking the developer
        if (target.id === process.env.DEV_ID) {
            const embed = new EmbedBuilder()
                .setColor("Red")
                .setTitle(`${blueHeart} Action Denied`)
                .setDescription(`⚡ **${target.tag}** is the **Bot Developer** and cannot be blocked.`)
                .setFooter({ text: "Respect the creator ✨" })
                .setTimestamp();

            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        // ✅ Normal blocking
        if (!client.blockedCommands.has(guildId)) {
            client.blockedCommands.set(guildId, {});
        }
        const guildBlocks = client.blockedCommands.get(guildId);
        if (!guildBlocks[commandName]) guildBlocks[commandName] = [];

        if (!guildBlocks[commandName].includes(target.id)) {
            guildBlocks[commandName].push(target.id);
        }

        const embed = new EmbedBuilder()
            .setColor("Blue")
            .setTitle(`${blueHeart} Command Blocked`)
            .setDescription(
                `🚫 **${target.tag}** has been blocked from using \`${commandName}\` in this server.`
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
