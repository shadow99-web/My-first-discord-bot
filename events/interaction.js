const { EmbedBuilder } = require("discord.js");
const { sendTicketPanel, handleTicketMenu, handleTicketClose } = require("../Handlers/ticketHandler");

module.exports = (client, blockHelpers) => {
    client.on("interactionCreate", async (interaction) => {
        try {
            // ---------- Slash Commands ----------
            if (interaction.isChatInputCommand()) {
                const command = client.commands.get(interaction.commandName);
                if (!command) return;

                if (blockHelpers.isBlocked?.(interaction.user.id, interaction.guildId, interaction.commandName)) {
                    return interaction.reply({
                        embeds: [
                            new EmbedBuilder()
                                .setColor("Red")
                                .setTitle("🚫 Command Blocked")
                                .setDescription(`You are blocked from using \`${interaction.commandName}\``)
                        ],
                        ephemeral: true
                    });
                }

                await command.execute({ interaction, client, isPrefix: false });
            }

            // ---------- Ticket Menu ----------
            if (interaction.isStringSelectMenu() && interaction.customId === "ticket_menu") {
                await handleTicketMenu(interaction);
            }

            // ---------- Ticket Close Button ----------
            if (interaction.isButton() && interaction.customId === "ticket_close_button") {
                await handleTicketClose(interaction);
            }
        } catch (err) {
            console.error(err);
            if (!interaction.replied)
                interaction.reply({ content: "❌ Something went wrong!", ephemeral: true }).catch(() => {});
        }
    });
};
