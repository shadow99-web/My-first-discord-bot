// handlers/ticketHandler.js
const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require("discord.js");

const blueHeart = "<a:blue_heart_1414309560231002194:1414309560231002194>";

// ---------- Send Ticket Panel ----------
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

// ---------- Handle Ticket Menu ----------
async function handleTicketMenu(interaction) {
    const category = interaction.values[0];
    const guild = interaction.guild;

    // Make sure the ticket category exists (or create one dynamically if you want)
    const ticketChannel = await guild.channels.create({
        name: `ticket-${interaction.user.username}-${category}`,
        type: 0, // 0 = text channel
        permissionOverwrites: [
            {
                id: guild.roles.everyone.id,
                deny: [PermissionFlagsBits.ViewChannel],
            },
            {
                id: interaction.user.id,
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
            },
            {
                id: guild.members.me.roles.highest.id,
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
            }
        ]
    });

    const embed = new EmbedBuilder()
        .setColor("Blue")
        .setTitle("📩 New Ticket")
        .setDescription(`Hello ${interaction.user}, thank you for opening a **${category}** ticket.\nA staff member will be with you shortly.`)
        .setTimestamp();

    const closeButton = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId("ticket_close_button")
            .setLabel("Close Ticket")
            .setEmoji("🔒")
            .setStyle(ButtonStyle.Danger)
    );

    await ticketChannel.send({ embeds: [embed], components: [closeButton] });
    await interaction.reply({ content: `✅ Ticket created: ${ticketChannel}`, ephemeral: true });
}

// ---------- Handle Ticket Close ----------
async function handleTicketClose(interaction) {
    const channel = interaction.channel;

    if (!channel.name.startsWith("ticket-")) {
        return interaction.reply({ content: "❌ This is not a ticket channel.", ephemeral: true });
    }

    await interaction.reply({ content: "🔒 Closing this ticket in 5 seconds...", ephemeral: true });

    setTimeout(() => {
        channel.delete().catch(() => {});
    }, 5000);
}

module.exports = { sendTicketPanel, handleTicketMenu, handleTicketClose };
