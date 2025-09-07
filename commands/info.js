const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("info")
        .setDescription("Get bot info"),
    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setTitle("🤖 Bot Information")
            .addFields(
                { name: "Developer", value: "👑JEETENDRA❤" },
                { name: "Library", value: "Discord.js v14" },
                { name: "Status", value: "Active" }
            )
            .setColor("Blue")
            .setFooter({ text: "🤝FEEL THE HONOR !" })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
