const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("user")
        .setDescription("Get user information")
        .addUserOption(option => option.setName("target").setDescription("Select a user")),
    async execute(context) {
        const user = context.isPrefix
            ? context.message.mentions.users.first() || context.message.author
            : context.interaction.options.getUser("target") || context.interaction.user;

        const embed = new EmbedBuilder()
            .setTitle(`👤 ${user.tag}`)
            .setThumbnail(user.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: "ID", value: user.id, inline: true },
                { name: "Bot?", value: user.bot ? "Yes" : "No", inline: true }
            )
            .setColor("Gold")
            .setTimestamp();

        if (context.isPrefix) await context.message.reply({ embeds: [embed] });
        else await context.interaction.reply({ embeds: [embed] });
    }
};
