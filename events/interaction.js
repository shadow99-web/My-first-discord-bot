// events/interaction.js
const { EmbedBuilder } = require("discord.js");
const { sendTicketPanel, handleTicketMenu, handleTicketClose } = require("../Handlers/ticketHandler");

module.exports = (client, blockHelpers) => {
    client.on("interactionCreate", async (interaction) => {
        try {
            // ---------- Slash Commands ----------
            if (interaction.isChatInputCommand()) {
                const command = client.commands.get(interaction.commandName);
                if (!command) return;

                const guildId = interaction.guildId;
                const userId = interaction.user.id;

                // Block check
                if (blockHelpers.isBlocked?.(guildId, userId)) {
                    return interaction.reply({
                        embeds: [
                            new EmbedBuilder()
                                .setColor("Red")
                                .setTitle("🚫 Command Blocked")
                                .setDescription(`You are blocked from using \`${interaction.commandName}\``)
                        ],
                        ephemeral: true
                    }).catch(() => {});
                }

                // ✅ Always defer early (keeps interaction alive)
                if (!interaction.deferred && !interaction.replied) {
                    await interaction.deferReply({ ephemeral: false });
                }

                // Standardized execute call
                await command.execute({
                    interaction,
                    message: null,
                    args: [],
                    client,
                    isPrefix: false
                });
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
            console.error("❌ Interaction handler error:", err);

            if (!interaction.replied && !interaction.deferred) {
                interaction.reply({
                    content: "⚠️ Something went wrong!",
                    ephemeral: true
                }).catch(() => {});
            } else {
                interaction.editReply({
                    content: "⚠️ Something went wrong!"
                }).catch(() => {});
            }
        }
    });
};
