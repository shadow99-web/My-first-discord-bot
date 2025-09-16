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

                // ✅ Safe defer (don’t break existing command replies)
                let deferred = false;
                if (!interaction.deferred && !interaction.replied) {
                    try {
                        await interaction.deferReply({ ephemeral: true });
                        deferred = true;
                    } catch (e) {
                        console.warn("Could not defer:", e.message);
                    }
                }

                // Run command
                try {
                    await command.execute({
                        interaction,
                        message: null,
                        args: [],
                        client,
                        isPrefix: false
                    });
                } catch (err) {
                    console.error(`❌ Error in command ${interaction.commandName}:`, err);

                    if (deferred && !interaction.replied) {
                        await interaction.editReply("⚠️ Something went wrong!").catch(() => {});
                    } else if (!interaction.replied) {
                        await interaction.reply({ content: "⚠️ Something went wrong!", ephemeral: true }).catch(() => {});
                    } else {
                        await interaction.followUp({ content: "⚠️ Something went wrong!", ephemeral: true }).catch(() => {});
                    }
                }
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
