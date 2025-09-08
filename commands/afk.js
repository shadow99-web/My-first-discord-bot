const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("afk")
        .setDescription("Set your AFK status with an optional reason")
        .addStringOption(option =>
            option.setName("reason")
                  .setDescription("Reason for going AFK")
                  .setRequired(false)
        ),

    async execute({ message, interaction, isPrefix, client, args }) {
        const blueHeart = "<a:blue_heart:1414309560231002194>";
        const user = isPrefix ? message.author : interaction.user;
        const reason = isPrefix ? args.join(" ") || "No reason provided" : interaction.options.getString("reason") || "No reason provided";

        // Store AFK data
        client.afk.set(user.id, { reason, since: Date.now(), mentions: [] });

        const embed = new EmbedBuilder()
            .setColor("Blue")
            .setAuthor({ name: `${user.tag} is now AFK`, iconURL: user.displayAvatarURL({ dynamic: true }) })
            .setDescription(`${blueHeart} Reason: **${reason}**`)
            .setTimestamp();

        if (isPrefix) message.reply({ embeds: [embed] });
        else interaction.reply({ embeds: [embed] });
    }
};
