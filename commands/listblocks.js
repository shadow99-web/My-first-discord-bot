const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const { getBlockedUsers } = require("../index");

module.exports = {
    name: "listblocked",
    description: "List all users blocked for a specific command",
    data: new SlashCommandBuilder()
        .setName("listblocked")
        .setDescription("See blocked users for a command")
        .addStringOption(opt => opt.setName("command").setDescription("Command name").setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(context) {
        const guild = context.isPrefix ? context.message.guild : context.interaction.guild;
        const commandName = context.isPrefix
            ? context.args[0]?.toLowerCase()
            : context.interaction.options.getString("command").toLowerCase();

        if (!commandName) {
            return context.isPrefix
                ? context.message.reply("❌ Usage: `!listblocked <command>`")
                : context.interaction.reply({ content: "❌ Please provide a command name.", ephemeral: true });
        }

        const blockedUsers = getBlockedUsers(guild.id, commandName);

        const embed = new EmbedBuilder()
            .setColor("Blue")
            .setTitle(`🚫 Blocked Users for \`${commandName}\``)
            .setDescription(
                blockedUsers.length > 0
                    ? blockedUsers.map(id => `<@${id}>`).join("\n")
                    : "No users are blocked for this command."
            )
            .setTimestamp();

        context.isPrefix
            ? context.message.reply({ embeds: [embed] })
            : context.interaction.reply({ embeds: [embed] });
    }
};
