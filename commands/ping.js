const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Check bot latency"),

    async execute({ interaction, message, safeReply, isPrefix, client }) {

        let latency;

        // Prefix command
        if (isPrefix) {
            latency = Date.now() - message.createdTimestamp;

            const embed = new EmbedBuilder()
                .setTitle("🏓 Pong!")
                .setDescription(`Latency is **${latency}ms**`)
                .setColor("Green")
                .setTimestamp();

            return message.reply({ embeds: [embed] });
        }

        // Slash command → MUST DEFER OR SAFE-REPLY
        try {
            await interaction.deferReply();

            latency = Date.now() - interaction.createdTimestamp;

            const embed = new EmbedBuilder()
                .setTitle("🏓 Pong!")
                .setDescription(`Latency is **${latency}ms**`)
                .setColor("Green")
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });

        } catch (err) {
            console.error("Ping command error:", err);
            return safeReply({
                content: "⚠️ Failed to send ping.",
                ephemeral: true
            });
        }
    }
};
