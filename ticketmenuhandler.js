const {
    ChannelType,
    PermissionFlagsBits,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require("discord.js");

module.exports = async (client, interaction) => {
    if (!interaction.isButton()) return;

    // 🎫 Create Ticket button
    if (interaction.customId === "ticket_create_button") {
        const existing = interaction.guild.channels.cache.find(
            c => c.name === `ticket-${interaction.user.id}`
        );
        if (existing) {
            return interaction.reply({
                content: "❌ You already have an open ticket!",
                ephemeral: true,
            });
        }

        const channel = await interaction.guild.channels.create({
            name: `ticket-${interaction.user.id}`,
            type: ChannelType.GuildText,
            permissionOverwrites: [
                {
                    id: interaction.guild.id,
                    deny: [PermissionFlagsBits.ViewChannel],
                },
                {
                    id: interaction.user.id,
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.ReadMessageHistory,
                    ],
                },
                // ⚠ Replace this with your staff role ID
                {
                    id: interaction.guild.roles.everyone,
                    deny: [PermissionFlagsBits.ViewChannel],
                },
            ],
        });

        const embed = new EmbedBuilder()
            .setColor("Green")
            .setTitle("🎫 New Ticket")
            .setDescription(
                `Welcome <@${interaction.user.id}>, a staff member will be with you shortly.\n\nWhen you’re done, press the button below to close this ticket.`
            )
            .setTimestamp();

        const closeBtn = new ButtonBuilder()
            .setCustomId("ticket_close_button")
            .setLabel("🔒 Close Ticket")
            .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder().addComponents(closeBtn);

        await channel.send({ embeds: [embed], components: [row] });

        await interaction.reply({
            content: `✅ Ticket created: ${channel}`,
            ephemeral: true,
        });
    }

    // 🔒 Close Ticket button
    if (interaction.customId === "ticket_close_button") {
        if (!interaction.channel.name.startsWith("ticket-")) {
            return interaction.reply({
                content: "❌ This command can only be used inside a ticket channel.",
                ephemeral: true,
            });
        }

        await interaction.reply({
            content: "🔒 Closing this ticket in **5 seconds**...",
        });

        setTimeout(() => {
            interaction.channel.delete().catch(() => {});
        }, 5000);
    }
};
