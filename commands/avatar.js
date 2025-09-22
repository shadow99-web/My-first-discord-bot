const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

const blueHeart = "<a:blue_heart:1414309560231002194>";

module.exports = {
    // Slash command data
    data: new SlashCommandBuilder()
        .setName("avatar")
        .setDescription("Get the avatar of a user")
        .addUserOption(option =>
            option.setName("target")
                  .setDescription("Select a user")
                  .setRequired(false)
        ),

    // Unified execute function for your interaction handler
    async execute({ client, interaction, message, args, isPrefix }) {
        try {
            let user;
            let avatarURL;
            let embed;

            if (isPrefix && message) {
                // Prefix command
                user = message.mentions.users.first() || message.author;
                avatarURL = user.displayAvatarURL({ dynamic: true, size: 1024 });

                embed = new EmbedBuilder()
                    .setTitle(`${blueHeart} Avatar of ${user.username}`)
                    .setDescription(`${blueHeart} [Click here to download](${avatarURL})`)
                    .setImage(avatarURL)
                    .setColor("Blue")
                    .setTimestamp()
                    .setFooter({ text: `Requested by ${message.author.tag}` });

                await message.reply({ embeds: [embed] });
            } else if (interaction) {
                // Slash command
                user = interaction.options?.getUser("target") || interaction.user;
                avatarURL = user.displayAvatarURL({ dynamic: true, size: 1024 });

                embed = new EmbedBuilder()
                    .setTitle(`${blueHeart} Avatar of ${user.username}`)
                    .setDescription(`${blueHeart} [Click here to download](${avatarURL})`)
                    .setImage(avatarURL)
                    .setColor("Blue")
                    .setTimestamp()
                    .setFooter({ text: `Requested by ${interaction.user.tag}` });

                await interaction.reply({ embeds: [embed] });
            }
        } catch (err) {
            console.error("❌ Avatar command error:", err);

            if (isPrefix && message) {
                await message.reply("⚠️ Could not fetch avatar.").catch(() => {});
            } else if (interaction && !interaction.replied) {
                await interaction.reply({ content: "⚠️ Could not fetch avatar.", ephemeral: true }).catch(() => {});
            }
        }
    }
};
