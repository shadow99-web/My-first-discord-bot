const { EmbedBuilder } = require("discord.js");

async function handleTruthDare(interaction, safeReply) {
  try {
    let type;

    if (interaction.customId === "td_random") type = Math.random() < 0.5 ? "truth" : "dare";
    else if (interaction.customId === "td_truth") type = "truth";
    else if (interaction.customId === "td_dare") type = "dare";
    else return;

    const res = await fetch(`https://api.truthordarebot.xyz/v1/${type}`);
    const data = await res.json();

    const embed = new EmbedBuilder()
      .setTitle(`✨ ${type.toUpperCase()}`)
      .setDescription(`${interaction.user} got: ${data.question || data.text}`)
      .setColor(type === "truth" ? "Blue" : type === "dare" ? "Red" : "Random")
      .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
      .setTimestamp();

    // Send publicly in the channel
    await interaction.channel.send({ embeds: [embed] }).catch(() => {});

    // Acknowledge button click to avoid "interaction failed"
    await interaction.deferUpdate().catch(() => {});

  } catch (err) {
    console.error("❌ Truth-Dare handler error:", err);
    if (safeReply) {
      await safeReply({ content: "⚠️ Something went wrong!" });
    } else if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: "⚠️ Something went wrong!" }).catch(() => {});
    }
  }
}

module.exports = { handleTruthDare };
