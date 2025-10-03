const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("username")
        .setDescription("Get a user's display name in copyable format")
        .addUserOption(opt =>
            opt.setName("target")
                .setDescription("Select a user")
        ),

    name: "username", // prefix support
    aliases: ["uname", "dname", "nick"],

    async execute({ interaction, message, client }) {
        const target = interaction
            ? interaction.options.getUser("target") || interaction.user
            : message.mentions.users.first() || message.author;

        const guild = interaction ? interaction.guild : message.guild;
        const member = guild.members.cache.get(target.id);

        const displayName = member?.nickname || target.username;

        const embed = new EmbedBuilder()
            .setColor("Blue")
            .setTitle("📛 Display Name")
            .setDescription(`\`\`\`${displayName}\`\`\``) // copyable format
            .setFooter({
                text: `Requested by ${interaction?.user.tag || message.author.tag}`,
                iconURL: (interaction?.user.displayAvatarURL() || message.author.displayAvatarURL())
            });

        if (interaction) {
            await interaction.reply({ embeds: [embed] });
        } else {
            await message.reply({ embeds: [embed] });
        }
    }
};
