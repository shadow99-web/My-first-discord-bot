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
        )
        .addStringOption(option =>
            option.setName("reason")
                .setDescription("Reason for unbanning")
                .setRequired(false)
        ),

    usage: "!unban <userID> [reason]",
    description: "Unban a user from the server",

    async execute({ message, interaction, client, args, isPrefix }) {
        const blueHeart = "<a:blue_heart:1414309560231002194>";

        const guild = isPrefix ? message.guild : interaction.guild;

        // Get target userID
        const userId = isPrefix
            ? args[0]
            : interaction.options.getString("userid");

        const reason = isPrefix
            ? args.slice(1).join(" ") || "No reason provided"
            : interaction.options.getString("reason") || "No reason provided";

        if (!userId) {
            return isPrefix
                ? message.reply("❌ Please provide a valid user ID to unban.")
                : interaction.reply({ content: "❌ Please provide a valid user ID.", ephemeral: true });
        }

        // Try fetching ban info
        const bans = await guild.bans.fetch();
        const bannedUser = bans.get(userId);

        if (!bannedUser) {
            return isPrefix
                ? message.reply("❌ That user is not banned.")
                : interaction.reply({ content: "❌ That user is not banned.", ephemeral: true });
        }

        // Unban the user
        await guild.members.unban(userId, reason);

        const embed = new EmbedBuilder()
            .setColor("Green")
            .setAuthor({ name: "🥂 User Unbanned", iconURL: bannedUser.user.displayAvatarURL({ dynamic: true }) })
            .setDescription(`${blueHeart} **${bannedUser.user.tag}** has been unbanned.\n\n📌 Reason: **${reason}**`)
            .addFields({ name: "🤝 Unbanned by", value: (isPrefix ? message.author : interaction.user).toString(), inline: true })
            .setTimestamp();

        if (isPrefix) message.reply({ embeds: [embed] });
        else interaction.reply({ embeds: [embed] });
    }
};
