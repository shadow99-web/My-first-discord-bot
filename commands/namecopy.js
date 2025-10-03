const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("namecopy")
        .setDescription("Get a user's display name in copyable format")
        .addUserOption(opt =>
            opt.setName("target")
                .setDescription("Select a user")
        ),

    name: "namecopy", // prefix support
    aliases: ["copyname", "getname"],

    async execute({ interaction, message }) {
        const target = interaction
            ? interaction.options.getUser("target") || interaction.user
            : message.mentions.users.first() || message.author;

        const guild = interaction ? interaction.guild : message.guild;
        const member = guild.members.cache.get(target.id);

        // ✅ Fetch display name (nickname > username)
        const displayName = member?.displayName || target.username;

        // ✅ Embed with copyable format
        const embed = new EmbedBuilder()
            .setColor("Blue")
            .setTitle("📋 Copyable Name")
            .setDescription(`\`\`\`${displayName}\`\`\``) // code block → copyable
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
