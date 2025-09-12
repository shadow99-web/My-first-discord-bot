// Handlers/ticketHandler.js
const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require("discord.js");

const blueHeart = "<a:blue_heart_1414309560231002194:1414309560231002194>";

// 📌 Send Ticket Panel
async function sendTicketPanel(channel) {
    const embed = new EmbedBuilder()
        .setColor("Blue")
        .setTitle("🎟️ Ticket System")
        .setDescription(`${blueHeart} Need help? Select a category below to create a private ticket.`)
        .setTimestamp();

    const menu = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId("ticket_menu")
            .setPlaceholder("📂 Choose a ticket category")
            .addOptions([
                { label: "General Support", value: "general", emoji: "🤝" },
                { label: "Appeal to be Staff", value: "staff", emoji: "🥂" },
                { label: "Appeal Ban for Member", value: "ban", emoji: "❌" },
                { label: "Report a Member", value: "report", emoji: "💢" }
            ])
    );

    await channel.send({ embeds: [embed], components: [menu] });
}

// 📌 Handle Menu Selection
async function handleTicketMenu(interaction) {
    const category = interaction.values[0];
    const user = interaction.user;

    const channel = await interaction.guild.channels.create({
        name: `ticket-${user.username}`,
        type: 0, // Text Channel
        permissionOverwrites: [
            {
                id: interaction.guild.id,
                deny: [PermissionFlagsBits.ViewChannel],
            },
            {
                id: user.id,
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
            }
        ]
    });

    const embed = new EmbedBuilder()
        .setColor("Blue")
        .setTitle("🎟️ New Ticket")
        .setDescription(`${blueHeart} Ticket opened by ${user}`)
        .addFields({ name: "Category", value: category })
        .setTimestamp()
        .setThumbnail(user.displayAvatarURL());

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId("ticket_close_button")
            .setLabel("Close Ticket")
            .setStyle(ButtonStyle.Danger)
    );

    await channel.send({ embeds: [embed], components: [row] });
    await interaction.reply({ content: `✅ Ticket created: ${channel}`, ephemeral: true });
}

// 📌 Handle Ticket Close
async function handleTicketClose(interaction) {
    await interaction.channel.delete().catch(() => {});
    await interaction.reply({ content: "❌ Ticket closed.", ephemeral: true }).catch(() => {});
}

module.exports = { sendTicketPanel, handleTicketMenu, handleTicketClose };
