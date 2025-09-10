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

    usage: "!ban @user [reason]", // helpful for prefix auto-usage
    description: "Ban a user from the server",

    async execute({ message, interaction, client, args, isPrefix }) {
        const blueHeart = "<a:blue_heart:1414309560231002194>";

        // Get target & reason
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

        // Fetch member from guild
        const guild = isPrefix ? message.guild : interaction.guild;
        const member = await guild.members.fetch(user.id).catch(() => null);

        if (!member) {
            return isPrefix
                ? message.reply("❌ That user is not in this server.")
                : interaction.reply({ content: "❌ That user is not in this server.", ephemeral: true });
        }

        // Prevent banning self or bot
        if (user.id === (isPrefix ? message.author.id : interaction.user.id)) {
            return isPrefix
                ? message.reply("❌ You cannot ban yourself.")
                : interaction.reply({ content: "❌ You cannot ban yourself.", ephemeral: true });
        }
        if (user.id === client.user.id) {
            return isPrefix
                ? message.reply("❌ You cannot ban me.")
                : interaction.reply({ content: "❌ You cannot ban me.", ephemeral: true });
        }

        // Role hierarchy check
        const executor = isPrefix ? message.member : interaction.member;
        if (member.roles.highest.position >= executor.roles.highest.position) {
            return isPrefix
                ? message.reply("❌ You cannot ban someone with an equal or higher role than you.")
                : interaction.reply({ content: "❌ You cannot ban someone with an equal or higher role than you.", ephemeral: true });
        }

        if (!member.bannable) {
            return isPrefix
                ? message.reply("❌ I cannot ban this user (check my role position).")
                : interaction.reply({ content: "❌ I cannot ban this user.", ephemeral: true });
        }

        // Try to DM the user before banning
        await user.send({
            embeds: [
                new EmbedBuilder()
                    .setColor("Red")
                    .setTitle("🚫 You have been banned")
                    .setDescription(`You were banned from **${guild.name}**.\n📌 Reason: **${reason}**`)
                    .setTimestamp()
            ]
        }).catch(() => {}); // Ignore DM fails

        // Ban the user
        await member.ban({ reason });

        // Confirmation embed
        const embed = new EmbedBuilder()
            .setColor("Red")
            .setAuthor({ name: `🥂 User Banned`, iconURL: user.displayAvatarURL({ dynamic: true }) })
            .setDescription(`${blueHeart} **${user.tag}** has been banned.\n\n📌 Reason: **${reason}**`)
            .addFields({ name: "😎 Banned by", value: executor.toString(), inline: true })
            .setTimestamp();

        if (isPrefix) message.reply({ embeds: [embed] });
        else interaction.reply({ embeds: [embed] });
    }
};
