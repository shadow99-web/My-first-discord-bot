const { EmbedBuilder, InteractionResponseFlags } = require("discord.js");
const fetch = require("node-fetch"); // make sure node-fetch installed

async function handleTruthDare(interaction) {
    try {
        let type;

        if (interaction.customId === "td_random") type = Math.random() < 0.5 ? "truth" : "dare";
        else if (interaction.customId === "td_truth") type = "truth";
        else if (interaction.customId === "td_dare") type = "dare";
        else return;

        const res = await fetch(`https://api.truthordarebot.xyz/v1/${type}`);
        const data = await res.json();

        const embed = new EmbedBuilder()
            .setTitle(`♥ ${type.toUpperCase()}`)
            .setDescription(data.question || data.text)
            .setColor("Random");

        if (interaction.replied || interaction.deferred) {
            await interaction.editReply({ embeds: [embed], flags: 64 }).catch(() => {});
        } else {
            await interaction.reply({ embeds: [embed], flags: 64 });
        }

    } catch (err) {
        console.error("❌ Truth-Dare handler error:", err);
        if (!interaction.replied) {
            await interaction.reply({ content: "⚠️ Something went wrong!", flags: 64 }).catch(() => {});
        }
    }
}

module.exports = { handleTruthDare };
