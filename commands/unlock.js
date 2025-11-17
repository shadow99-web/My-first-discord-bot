// commands/unlock.js
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("unlock")
        .setDescription("Unlocks the current channel for everyone.")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    name: "unlock", // for prefix
    description: "Unlocks the current channel for everyone.",

    async execute({ interaction, message, client }) {
        const blueHeart = "<a:blue_heart_1414309560231002194:1414309560231002194>";
        const channel = interaction ? interaction.channel : message.channel;

        try {
            await channel.permissionOverwrites.edit(channel.guild.roles.everyone, {
                SendMessages: true
            });

            const embed = new EmbedBuilder()
                .setColor("Blue")
                .setAuthor({
                    name: channel.guild.name,
                    iconURL: channel.guild.iconURL({ dynamic: true })
                })
                .setDescription(`${blueHeart}  ${channel} has been **unlocked**!`)
                .setTimestamp();

            if (interaction) {
                await interaction.reply({ embeds: [embed] });
            } else {
                await message.reply({ embeds: [embed] });
            }
        } catch (err) {
            console.error("Unlock Error:", err);
            if (interaction) {
                await interaction.reply({ content: "❌ Failed to unlock the channel.", ephemeral: true });
            } else {
                await message.reply("❌ Failed to unlock the channel.");
            }
        }
    }
};
