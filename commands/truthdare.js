const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("truthdare")
        .setDescription("Creates a Truth or Dare panel with buttons!"),
    
    async execute({ interaction }) {
        const embed = new EmbedBuilder()
            .setTitle("🤞🏻 Truth or Dare")
            .setDescription("Click a button to get Truth, Dare, or Random!")
            .setColor("Random");

        const buttons = new ActionRowBuilder().addComponents(
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
                .setStyle(ButtonStyle.Success)
        );

        await interaction.reply({ embeds: [embed], components: [buttons] });
    }
};
