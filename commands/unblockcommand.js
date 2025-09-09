const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
    name: "unblockcommand",
    description: "Unblock a command for a specific user",
    data: new SlashCommandBuilder()
        .setName("unblockcommand")
        .setDescription("Unblock a command for a user")
        .addUserOption(option =>
            option.setName("user")
                .setDescription("User to unblock")
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName("command")
                .setDescription("Command to unblock")
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(context) {
        const blueHeart = "<a:blue_heart_1414309560231002194:1414309560231002194>";
        const client = context.client;
        const guild = context.isPrefix ? context.message.guild : context.interaction.guild;

        // Fetch user + command
        const targetUser = context.isPrefix 
            ? context.message.mentions.users.first() 
            : context.interaction.options.getUser("user");
        const commandName = context.isPrefix 
            ? context.args[1] 
            : context.interaction.options.getString("command");

        if (!targetUser || !commandName) {
            const errorEmbed = new EmbedBuilder()
                .setColor("Red")
                .setDescription(`${blueHeart} Please mention a valid user and command!`);
            return context.isPrefix
                ? context.message.reply({ embeds: [errorEmbed] })
                : context.interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        // Remove from block list
        if (
            client.blockedCommands &&
            client.blockedCommands[guild.id] &&
            client.blockedCommands[guild.id][targetUser.id]
        ) {
            client.blockedCommands[guild.id][targetUser.id] =
                client.blockedCommands[guild.id][targetUser.id].filter(cmd => cmd !== commandName);
        }

        const embed = new EmbedBuilder()
            .setColor("Green")
            .setTitle(`${blueHeart} Command Unblocked`)
            .setDescription(
                `✅ User **${targetUser.tag}** can now use \`${commandName}\` again.`
            )
            .setFooter({ text: `Set by ${context.isPrefix ? context.message.author.tag : context.interaction.user.tag}` })
            .setTimestamp();

        return context.isPrefix
            ? context.message.reply({ embeds: [embed] })
            : context.interaction.reply({ embeds: [embed] });
    }
};
