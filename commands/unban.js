const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("unban")
        .setDescription("Unban a user from the server")
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .addStringOption(option =>
            option.setName("userid")
                .setDescription("The ID of the user to unban")
                .setRequired(true)
        ),

    async execute({ message, interaction, client, args, isPrefix }) {
        const blueHeart = "<a:blue_heart:1414309560231002194>";
        const userId = isPrefix ? args[0] : interaction.options.getString("userid");

        if (!userId) {
            return isPrefix
                ? message.reply("❌ Please provide a valid user ID to unban.")
                : interaction.reply({ content: "❌ Please provide a valid user ID.", ephemeral: true });
        }

        try {
            await (interaction?.guild ?? message.guild).members.unban(userId);

            const embed = new EmbedBuilder()
                .setColor("Green")
                .setAuthor({ name: `🤝 User Unbanned` })
                .setDescription(`${blueHeart} User with ID **${userId}** has been unbanned.`)
                .setTimestamp();

            if (isPrefix) message.reply({ embeds: [embed] });
            else interaction.reply({ embeds: [embed] });
        } catch (err) {
            console.error(err);
            return isPrefix
                ? message.reply("❌ Failed to unban this user. Make sure the ID is correct.")
                : interaction.reply({ content: "❌ Failed to unban this user.", ephemeral: true });
        }
    }
};
