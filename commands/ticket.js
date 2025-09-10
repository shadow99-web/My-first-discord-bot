const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ticket")
        .setDescription("🎫 Ticket system help & setup"),

    async execute({ interaction }) {
        const embed = new EmbedBuilder()
            .setColor("Blue")
            .setTitle("🎫 Ticket System Help Menu")
            .setDescription(
                "Our ticket system is here to help you!\nExplore its features and set the best ticket system for your server."
            )
            .addFields(
                { name: "🖥 Commands", value: "Browse through all ticket commands and utilities!" },
                { name: "📖 FAQ", value: "Find solutions for the most common questions." },
                { name: "⚙ Setup", value: "Step-by-step guide to setting up tickets on your server." }
            )
            .setFooter({ text: "YourBot • Ticket System" })
            .setTimestamp();

        // Dropdown menu
        const menu = new StringSelectMenuBuilder()
            .setCustomId("ticket_help_menu")
            .setPlaceholder("📌 Select what you need help with")
            .addOptions([
                {
                    label: "🎫 Create Ticket",
                    description: "Open a new support ticket",
                    value: "create_ticket",
                },
                {
                    label: "🖥 Commands",
                    description: "View all ticket commands",
                    value: "ticket_commands",
                },
                {
                    label: "📖 FAQ",
                    description: "Get answers to common questions",
                    value: "ticket_faq",
                },
                {
                    label: "⚙ Setup",
                    description: "Learn how to configure the ticket system",
                    value: "ticket_setup",
                },
            ]);

        // Create Ticket button
        const createButton = new ButtonBuilder()
            .setCustomId("ticket_create_button")
            .setLabel("🎫 Create Ticket")
            .setStyle(ButtonStyle.Primary);

        const row1 = new ActionRowBuilder().addComponents(menu);
        const row2 = new ActionRowBuilder().addComponents(createButton);

        await interaction.reply({ embeds: [embed], components: [row1, row2] });
    },
};
