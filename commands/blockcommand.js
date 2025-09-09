const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const { addBlock, removeBlock, getBlockedUsers } = require("../index"); // Import from index.js

module.exports = {
    name: "blockcommand",
    description: "Block a user from using a specific command",
    data: new SlashCommandBuilder()
        .setName("blockcommand")
        .setDescription("Block a user from a specific command")
        .addUserOption(opt => opt.setName("user").setDescription("User to block").setRequired(true))
        .addStringOption(opt => opt.setName("command").setDescription("Command name").setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(context) {
        const guild = context.isPrefix ? context.message.guild : context.interaction.guild;
        const author = context.isPrefix ? context.message.author : context.interaction.user;

        // ===== Permissions check =====
        if (!guild.members.me.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return context.isPrefix
                ? context.message.reply("❌ I need `Manage Server` permission to block users.")
                : context.interaction.reply({ content: "❌ I need `Manage Server` permission to block users.", ephemeral: true });
        }

        // ===== Get user & command =====
        const user = context.isPrefix
            ? context.message.mentions.users.first()
            : context.interaction.options.getUser("user");

        const commandName = context.isPrefix
            ? context.args[1]?.toLowerCase()
            : context.interaction.options.getString("command").toLowerCase();

        if (!user || !commandName) {
            return context.isPrefix
                ? context.message.reply("❌ Usage: `!blockcommand @user <command>`")
                : context.interaction.reply({ content: "❌ Please provide both user and command.", ephemeral: true });
        }

        if (user.id === process.env.DEV_ID) {
            return context.isPrefix
                ? context.message.reply("🚫 You cannot block the Developer.")
                : context.interaction.reply({ content: "🚫 You cannot block the Developer.", ephemeral: true });
        }

        // ===== Add block =====
        addBlock(guild.id, commandName, user.id);

        // ===== Confirmation embed =====
        const embed = new EmbedBuilder()
            .setColor("Red")
            .setTitle("🔒 Command Blocked")
            .setDescription(`User ${user} has been **blocked** from using \`${commandName}\`.`)
            .setThumbnail(user.displayAvatarURL({ dynamic: true }))
            .setFooter({ text: `Blocked by ${author.tag}` })
            .setTimestamp();

        context.isPrefix
            ? context.message.reply({ embeds: [embed] })
            : context.interaction.reply({ embeds: [embed] });
    }
};
