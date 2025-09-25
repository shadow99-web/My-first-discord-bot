const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("truthdare")
        .setDescription("Generate a Truth-Dare panel"),
    async execute({ interaction }) {
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId("td_truth")
                    .setLabel("Truth")
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId("td_dare")
                    .setLabel("Dare")
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId("td_random")
                    .setLabel("Random")
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.reply({
            content: "Choose your challenge:",
            components: [row],
            flags: 64 // ephemeral
        });
    }
};
