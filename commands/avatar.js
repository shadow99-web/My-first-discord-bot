const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

const blueHeart = "<a:blue_heart:1414309560231002194>";

module.exports = {
    data: new SlashCommandBuilder()
        .setName("avatar")
        .setDescription("Get the avatar of a user")
        .addUserOption(option =>
            option.setName("target")
                .setDescription("Select a user")
        ),

    // Slash command handler
    async execute(interaction) {
        try {
            const user = interaction.options.getUser("target") || interaction.user;
            const avatarURL = user.displayAvatarURL({ dynamic: true, size: 1024 });

            const embed = new EmbedBuilder()
                .setTitle(`${blueHeart} Avatar of ${user.username}`)
                .setDescription(`${blueHeart} [Click here to download](${avatarURL})`)
                .setImage(avatarURL)
                .setColor("Blue")
                .setTimestamp()
                .setFooter({ text: `Requested by ${interaction.user.tag}` });

            await interaction.reply({ embeds: [embed] });
        } catch (err) {
            console.error("❌ Avatar slash error:", err);
            if (!interaction.replied) {
                await interaction.reply({ content: "⚠️ Could not fetch avatar.", flags: 64 }).catch(() => {});
            }
        }
    },

    // Prefix handler
    async prefixRun(message, args) {
        try {
            const user = message.mentions.users.first() || message.author;
            const avatarURL = user.displayAvatarURL({ dynamic: true, size: 1024 });

            const embed = new EmbedBuilder()
                .setTitle(`${blueHeart} Avatar of ${user.username}`)
                .setDescription(`${blueHeart} [Click here to download](${avatarURL})`)
                .setImage(avatarURL)
                .setColor("Blue")
                .setTimestamp()
                .setFooter({ text: `Requested by ${message.author.tag}` });

            await message.reply({ embeds: [embed] });
        } catch (err) {
            console.error("❌ Avatar prefix error:", err);
            await message.reply("⚠️ Could not fetch avatar.").catch(() => {});
        }
    }
};
