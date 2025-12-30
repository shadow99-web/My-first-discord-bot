const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

async function handleTruthDare(interaction, safeReply) {
  try {
    let type;

    if (interaction.customId === "td_random") type = Math.random() < 0.5 ? "truth" : "dare";
    else if (interaction.customId === "td_truth") type = "truth";
    else if (interaction.customId === "td_dare") type = "dare";
    else return;

    const res = await fetch(`https://api.truthordarebot.xyz/v1/${type}`);
    const data = await res.json();

    // Create embed
    const embed = new EmbedBuilder()
      .setTitle(`<:k_:1455575860697497612> ${interaction.user.displayAvatarURL()} ${type.toUpperCase()}`)
      .setDescription(` ${data.question || data.text}`)
      .setColor(type === "truth" ? "Blue" : type === "dare" ? "Red" : "Random")
      .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
      .setTimestamp();

    // Create buttons row
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("td_truth").setLabel("Truth").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("td_dare").setLabel("Dare").setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId("td_random").setLabel("Random").setStyle(ButtonStyle.Primary)
    );

    // Send publicly
    await interaction.channel.send({ embeds: [embed], components: [row] }).catch(() => {});

    // Acknowledge interaction to avoid "This interaction failed"
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
