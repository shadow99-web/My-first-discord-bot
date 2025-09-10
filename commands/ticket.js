const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder
} = require("discord.js");

const blueHeart = "<a:blue_heart:1414309560231002194>";

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ticket")
        .setDescription("Open the ticket help panel"),

    async execute({ interaction, message, client, isPrefix }) {
        const embed = new EmbedBuilder()
            .setColor("Blue")
            .setTitle("🎟️ Ticket System")
            .setDescription(`${blueHeart} Need help? Select a category below to create a private ticket.`)
            .setTimestamp();

        const menu = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId("ticket_menu")
                .setPlaceholder("📂 Choose a ticket category")
                .addOptions([
                    { label: "General Support", value: "general", emoji: "💬" },
                    { label: "Appeal to be Staff", value: "staff", emoji: "🛡️" },
                    { label: "Appeal Ban for Member", value: "ban", emoji: "📩" },
                    { label: "Report a Member", value: "report", emoji: "🚨" }
                ])
        );

        // For slash command
        if (!isPrefix && interaction) {
            await interaction.channel.send({ embeds: [embed], components: [menu] });
            return interaction.reply({ content: "✅ Ticket panel sent!", ephemeral: true });
        }

        // For prefix command
        if (isPrefix && message) {
            await message.channel.send({ embeds: [embed], components: [menu] });
            return message.reply("✅ Ticket panel sent!");
        }
    }
};
