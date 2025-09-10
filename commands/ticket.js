const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
    PermissionFlagsBits
} = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ticket")
        .setDescription("🎫 Ticket system help & setup"),

    async execute({ message, interaction, client, isPrefix }) {
        const guild = interaction?.guild ?? message.guild;
        const user = interaction?.user ?? message.author;

        // Help Embed
        const embed = new EmbedBuilder()
            .setColor("Blue")
            .setTitle("🎫 Ticket System Help Menu")
            .setDescription("Our ticket system is here to help you!\nExplore its features and set the best ticket system for your server.")
            .addFields(
                { name: "🖥 Commands", value: "Browse through all ticket commands and utilities!" },
                { name: "📖 FAQ", value: "Find solutions for the most common questions." },
                { name: "⚙ Setup", value: "Step-by-step guide to setting up tickets on your server." }
            )
            .setFooter({ text: `${client.user.username} • Ticket System` })
            .setTimestamp();

        // Dropdown menu
        const menu = new StringSelectMenuBuilder()
            .setCustomId("ticket_help_menu")
            .setPlaceholder("📌 Select what you need help with")
            .addOptions([
                { label: "🎫 Create Ticket", description: "Open a new support ticket", value: "create_ticket" },
                { label: "🖥 Commands", description: "View all ticket commands", value: "ticket_commands" },
                { label: "📖 FAQ", description: "Get answers to common questions", value: "ticket_faq" },
                { label: "⚙ Setup", description: "Learn how to configure the ticket system", value: "ticket_setup" },
            ]);

        // Create Ticket button
        const createButton = new ButtonBuilder()
            .setCustomId("ticket_create_button")
            .setLabel("🎫 Create Ticket")
            .setStyle(ButtonStyle.Primary);

        const row1 = new ActionRowBuilder().addComponents(menu);
        const row2 = new ActionRowBuilder().addComponents(createButton);

        // Send response depending on prefix/slash
        if (isPrefix) {
            await message.reply({ embeds: [embed], components: [row1, row2] });
        } else {
            await interaction.reply({ embeds: [embed], components: [row1, row2] });
        }

        // -------- Interaction Handling --------
        client.on("interactionCreate", async i => {
            if (!i.isButton() && !i.isStringSelectMenu()) return;

            // --- Ticket Creation ---
            if (i.customId === "ticket_create_button" || (i.isStringSelectMenu() && i.values[0] === "create_ticket")) {
                const existing = i.guild.channels.cache.find(c => c.name === `ticket-${i.user.id}`);
                if (existing) {
                    return i.reply({
                        embeds: [new EmbedBuilder().setColor("Yellow").setDescription(`⚠ You already have a ticket: ${existing}`)],
                        ephemeral: true
                    });
                }

                const ticketChannel = await i.guild.channels.create({
                    name: `ticket-${i.user.id}`,
                    type: ChannelType.GuildText,
                    permissionOverwrites: [
                        { id: i.guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
                        { id: i.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
                    ],
                });

                const ticketEmbed = new EmbedBuilder()
                    .setColor("Green")
                    .setTitle("🎫 Ticket Created")
                    .setDescription(`Hello ${i.user}, a staff member will be with you shortly.`);

                const closeButton = new ButtonBuilder()
                    .setCustomId("ticket_close_button")
                    .setLabel("🔒 Close Ticket")
                    .setStyle(ButtonStyle.Danger);

                await ticketChannel.send({
                    content: `<@${i.user.id}>`,
                    embeds: [ticketEmbed],
                    components: [new ActionRowBuilder().addComponents(closeButton)]
                });

                return i.reply({
                    embeds: [new EmbedBuilder().setColor("Green").setDescription(`✅ Ticket created: ${ticketChannel}`)],
                    ephemeral: true
                });
            }

            // --- Ticket Closing ---
            if (i.customId === "ticket_close_button") {
                if (!i.channel.name.startsWith("ticket-")) {
                    return i.reply({
                        embeds: [new EmbedBuilder().setColor("Red").setDescription("❌ This button only works inside a ticket channel.")],
                        ephemeral: true
                    });
                }

                await i.channel.delete();
            }
        });
    },
};
