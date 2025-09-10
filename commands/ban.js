const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ban")
        .setDescription("Ban a user from the server")
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .addUserOption(option =>
            option.setName("target")
                .setDescription("The user to ban")
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName("reason")
                .setDescription("Reason for banning")
                .setRequired(false)
        ),

    async execute({ message, interaction, client, args, isPrefix }) {
        const blueHeart = "<a:blue_heart:1414309560231002194>";

        const user = isPrefix
            ? message.mentions.users.first()
            : interaction.options.getUser("target");

        const reason = isPrefix
            ? args.slice(1).join(" ") || "No reason provided"
            : interaction.options.getString("reason") || "No reason provided";

        if (!user) {
            return isPrefix
                ? message.reply("❌ Please mention a user to ban.")
                : interaction.reply({ content: "❌ Please provide a valid user.", ephemeral: true });
        }

        const member = await interaction?.guild?.members.fetch(user.id)
            .catch(() => message.guild.members.cache.get(user.id));

        if (!member) {
            return isPrefix
                ? message.reply("❌ That user is not in this server.")
                : interaction.reply({ content: "❌ That user is not in this server.", ephemeral: true });
        }

        if (!member.bannable) {
            return isPrefix
                ? message.reply("❌ I cannot ban this user (maybe higher role?).")
                : interaction.reply({ content: "❌ I cannot ban this user.", ephemeral: true });
        }

        await member.ban({ reason });

        const embed = new EmbedBuilder()
            .setColor("Red")
            .setAuthor({ name: `🥂 User Banned`, iconURL: user.displayAvatarURL({ dynamic: true }) })
            .setDescription(`${blueHeart} **${user.tag}** has been banned.\n\n📌 Reason: **${reason}**`)
            .setTimestamp();

        if (isPrefix) message.reply({ embeds: [embed] });
        else interaction.reply({ embeds: [embed] });
    }
};
