const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
    name: "blockcommand",
    description: "Block a command from being used by a specific user",
    data: new SlashCommandBuilder()
        .setName("blockcommand")
        .setDescription("Block a command from a user")
        .addUserOption(option =>
            option.setName("user")
                .setDescription("User to block")
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName("command")
                .setDescription("Command to block")
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

        // Prevent blocking developer
        if (targetUser.id === process.env.DEV_ID) {
            const devEmbed = new EmbedBuilder()
                .setColor("Gold")
                .setDescription(`${blueHeart} You cannot block the developer! ⚡`);
            return context.isPrefix
                ? context.message.reply({ embeds: [devEmbed] })
                : context.interaction.reply({ embeds: [devEmbed], ephemeral: true });
        }

        // Initialize storage
        if (!client.blockedCommands) client.blockedCommands = {};
        if (!client.blockedCommands[guild.id]) client.blockedCommands[guild.id] = {};

        // Save block
        if (!client.blockedCommands[guild.id][targetUser.id]) {
            client.blockedCommands[guild.id][targetUser.id] = [];
        }
        client.blockedCommands[guild.id][targetUser.id].push(commandName);

        const embed = new EmbedBuilder()
            .setColor("Blue")
            .setTitle(`${blueHeart} Command Blocked`)
            .setDescription(
                `🔒 User **${targetUser.tag}** is now blocked from using \`${commandName}\`.`
            )
            .setFooter({ text: `Set by ${context.isPrefix ? context.message.author.tag : context.interaction.user.tag}` })
            .setTimestamp();

        return context.isPrefix
            ? context.message.reply({ embeds: [embed] })
            : context.interaction.reply({ embeds: [embed] });
    }
};
