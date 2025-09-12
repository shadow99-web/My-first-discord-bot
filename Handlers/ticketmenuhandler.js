const {
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
    PermissionFlagsBits
} = require("discord.js");

const blueHeart = "<a:blue_heart_1414309560231002194>";

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

async function handleTicketMenu(interaction) {
    const type = interaction.values[0];
    const existing = interaction.guild.channels.cache.find(c => c.name === `ticket-${interaction.user.id}`);
    if (existing) return interaction.reply({ content: "❌ You already have an open ticket!", ephemeral: true });

    const channel = await interaction.guild.channels.create({
        name: `ticket-${interaction.user.id}`,
        type: ChannelType.GuildText,
        permissionOverwrites: [
            { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
            { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }
        ]
    });

    const embed = new EmbedBuilder()
        .setColor("Green")
        .setTitle("🎫 New Ticket")
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
        .setDescription(`${blueHeart} Ticket Type: **${type}**\nWelcome <@${interaction.user.id}>, staff will assist you soon.\nPress 🔒 to close.`);

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("ticket_close_button").setLabel("🔒 Close Ticket").setStyle(ButtonStyle.Danger)
    );

    await channel.send({ content: `<@${interaction.user.id}>`, embeds: [embed], components: [row] });
    return interaction.reply({ content: `✅ Ticket created: ${channel}`, ephemeral: true });
}

async function handleTicketClose(interaction) {
    if (!interaction.channel.name.startsWith("ticket-"))
        return interaction.reply({ content: "❌ Only usable inside ticket channels.", ephemeral: true });
    await interaction.reply({ content: "🔒 Closing ticket in 5 seconds..." });
    setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
}

module.exports = { sendTicketPanel, handleTicketMenu, handleTicketClose };
