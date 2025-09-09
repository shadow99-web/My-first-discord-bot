const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const { removeBlock } = require("../index");

module.exports = {
    name: "unblockcommand",
    description: "Unblock a user from a specific command",
    data: new SlashCommandBuilder()
        .setName("unblockcommand")
        .setDescription("Unblock a user from a specific command")
        .addUserOption(opt => opt.setName("user").setDescription("User to unblock").setRequired(true))
        .addStringOption(opt => opt.setName("command").setDescription("Command name").setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(context) {
        const guild = context.isPrefix ? context.message.guild : context.interaction.guild;
        const author = context.isPrefix ? context.message.author : context.interaction.user;

        const user = context.isPrefix 
            ? context.message.mentions.users.first() 
            : context.interaction.options.getUser("user");
        const commandName = context.isPrefix 
            ? context.args[1]?.toLowerCase() 
            : context.interaction.options.getString("command").toLowerCase();

        if (!user || !commandName) {
            return context.isPrefix 
                ? context.message.reply("❌ Usage: `!unblockcommand @user <command>`")
                : context.interaction.reply({ content: "❌ Please provide both user and command.", ephemeral: true });
        }

        removeBlock(guild.id, commandName, user.id);

        const embed = new EmbedBuilder()
            .setColor("Green")
            .setTitle("🔓 Command Unblocked")
            .setDescription(`User ${user} can now use \`${commandName}\`.`)
            .setThumbnail(user.displayAvatarURL({ dynamic: true }))
            .setFooter({ text: `Unblocked by ${author.tag}` })
            .setTimestamp();

        context.isPrefix 
            ? context.message.reply({ embeds: [embed] }) 
            : context.interaction.reply({ embeds: [embed] });
    }
};
