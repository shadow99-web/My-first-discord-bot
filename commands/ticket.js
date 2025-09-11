// =============================
// 🎟️ Ticket Command (Slash + Prefix support)
// =============================
const { SlashCommandBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ticket")
        .setDescription("🎫 Open the ticket help panel"),

    async execute({ message, interaction, client, isPrefix }) {
        // ✅ Logic is handled in Handlers/ticketHandler.js
        // This just ensures the command is registered and valid.

        if (isPrefix) {
            await message.reply("✅ Ticket command is enabled! Use it to open the ticket panel.");
        } else {
            await interaction.reply({ content: "✅ Ticket command is enabled! Use it to open the ticket panel.", ephemeral: true });
        }
    }
};
