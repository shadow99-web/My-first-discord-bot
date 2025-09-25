const fetch = require("node-fetch"); // npm install node-fetch@2
const { EmbedBuilder } = require("discord.js");

async function handleTruthDare(interaction) {
    try {
        let type;

        if (interaction.customId === "td_random") {
            type = Math.random() < 0.5 ? "truth" : "dare";
        } else if (interaction.customId === "td_truth") {
            type = "truth";
        } else if (interaction.customId === "td_dare") {
            type = "dare";
        } else {
            return; // not a truth-dare button
        }

        // Fetch random truth/dare
        const res = await fetch(`https://api.truthordarebot.xyz/v1/${type}`);
        const data = await res.json();

        const embed = new EmbedBuilder()
            .setTitle(`♥ ${type.toUpperCase()}`)
            .setDescription(data.question || data.text)
            .setColor("Random");

        await interaction.reply({ embeds: [embed], ephemeral: true });

    } catch (err) {
        console.error("❌ Truth-Dare handler error:", err);
        if (!interaction.replied) {
            await interaction.reply({ content: "⚠️ Something went wrong!", ephemeral: true });
        }
    }
}

module.exports = { handleTruthDare };
