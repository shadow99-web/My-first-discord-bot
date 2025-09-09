const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const { getBlockedUsers } = require("../index");

module.exports = {
    name: "listblocks",
    description: "List all blocked users per command",
    data: new SlashCommandBuilder()
        .setName("listblocks")
        .setDescription("List all blocked users per command")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(context) {
        const guild = context.isPrefix ? context.message.guild : context.interaction.guild;

        const blockedData = require("../block.json")[guild.id] || {};
        if (Object.keys(blockedData).length === 0) {
            return context.isPrefix
                ? context.message.reply("✅ No users are blocked in this server.")
                : context.interaction.reply({ content: "✅ No users are blocked in this server.", ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setColor("Blue")
            .setTitle("📜 Blocked Users List")
            .setFooter({ text: `Server: ${guild.name}` })
            .setTimestamp();

        for (const [commandName, users] of Object.entries(blockedData)) {
            const mentions = users.map(id => {
                const member = guild.members.cache.get(id);
                return member 
                    ? `${member.user} (${member.user.username})` 
                    : `Unknown User (${id})`;
            }).join("\n");

            embed.addFields({ 
                name: `⚔️ Command: \`${commandName}\``, 
                value: mentions || "None", 
                inline: false 
            });
        }

        context.isPrefix 
            ? context.message.reply({ embeds: [embed] }) 
            : context.interaction.reply({ embeds: [embed] });
    }
};
