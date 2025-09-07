const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("avatar")
        .setDescription("Get user's avatar")
        .addUserOption(option => option.setName("target").setDescription("Select a user")),
    async execute(context) {
        const user = context.isPrefix ? (context.message.mentions.users.first() || context.message.author) : (context.interaction.options.getUser("target") || context.interaction.user);

        const embed = new EmbedBuilder()
            .setTitle(`❣️Avatar of ${user.username}`)
            .setImage(user.displayAvatarURL({ dynamic: true, size: 1024 }))
            .setColor("Blue")
            .setTimestamp();

        if (context.isPrefix) await context.message.reply({ embeds: [embed] });
        else await context.interaction.reply({ embeds: [embed] });
    }
};
