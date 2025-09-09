const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const { getBlockedUsers } = require("../blockManager"); // ✅ Import from blockManager

module.exports = {
    name: "listblocked",
    description: "List all blocked users for a command",
    data: new SlashCommandBuilder()
        .setName("listblocked")
        .setDescription("Shows all users blocked from a command")
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

        const blocked = getBlockedUsers(guild.id, commandName);
        if (blocked.length === 0) {
            return context.isPrefix
                ? context.message.reply(`✅ No users are blocked from using \`${commandName}\`.`)
                : context.interaction.reply({ content: `✅ No users are blocked from using \`${commandName}\`.`, ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setColor("Yellow")
            .setTitle(`🚫 Blocked Users for ${commandName}`)
            .setDescription(blocked.map(id => `<@${id}>`).join("\n"))
            .setTimestamp();

        context.isPrefix
            ? context.message.reply({ embeds: [embed] })
            : context.interaction.reply({ embeds: [embed] });
    }
};
