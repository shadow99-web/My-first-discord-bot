const { EmbedBuilder } = require("discord.js");

module.exports = async (client, interaction) => {
    if (!interaction.isStringSelectMenu()) return;
    if (interaction.customId !== "ticket_help_menu") return;

    let embed = new EmbedBuilder().setColor("Blue").setTimestamp();

    if (interaction.values[0] === "create_ticket") {
        embed.setTitle("🎫 Create Ticket").setDescription("Use `/ticket open` or the **Create Ticket** button to start a new ticket.");
    }

    if (interaction.values[0] === "ticket_commands") {
        embed.setTitle("🖥 Ticket Commands").setDescription("`/ticket open` → Open a ticket\n`/ticket close` → Close a ticket\n`/ticket config` → View config");
    }

    if (interaction.values[0] === "ticket_faq") {
        embed.setTitle("📖 FAQ").setDescription("❓ *Why use tickets?*\nTickets allow private support between staff and users.");
    }

    if (interaction.values[0] === "ticket_setup") {
        embed.setTitle("⚙ Setup Guide").setDescription("1️⃣ Set staff role\n2️⃣ Run `/ticket panel`\n3️⃣ Users can now open tickets via the panel!");
    }

    await interaction.update({ embeds: [embed] });
};
