// commands/ticket.js
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
        .setDescription("🎫 Open the ticket help panel"),

    async execute({ message, interaction, client, isPrefix }) {
        const user = interaction?.user ?? message.author;

        // 📌 Main Help Embed
        const embed = new EmbedBuilder()
            .setColor("Blue")
            .setTitle("🎫 Ticket System Help Menu")
            .setDescription(
                "Need help? Open a private support ticket.\n" +
                "Choose a category below or click **Create Ticket**."
            )
            .setFooter({ text: `${client.user.username} • Ticket System` })
            .setTimestamp();

        // 📌 Category Menu
        const menu = new StringSelectMenuBuilder()
            .setCustomId("ticket_menu")
            .setPlaceholder("📌 Select a category")
            .addOptions([
                { label: "🛠 General Support", value: "general" },
                { label: "💳 Billing Support", value: "billing" },
                { label: "⚙ Technical Support", value: "technical" },
            ]);

        // 📌 Create Ticket Button
        const createButton = new ButtonBuilder()
            .setCustomId("ticket_create")
            .setLabel("🎫 Create Ticket")
            .setStyle(ButtonStyle.Primary);

        const row1 = new ActionRowBuilder().addComponents(menu);
        const row2 = new ActionRowBuilder().addComponents(createButton);

        // Send depending on prefix/slash
        if (isPrefix) {
            await message.reply({ embeds: [embed], components: [row1, row2] });
        } else {
            await interaction.reply({ embeds: [embed], components: [row1, row2] });
        }
    },

    // 🎯 Interaction Handler
    async handleComponent(interaction) {
        if (interaction.customId === "ticket_create" || interaction.customId === "ticket_menu") {
            const category = interaction.values?.[0] ?? "general";

            // Check if user already has a ticket
            const existing = interaction.guild.channels.cache.find(
                c => c.name === `ticket-${interaction.user.id}`
            );
            if (existing) {
                return interaction.reply({
                    embeds: [new EmbedBuilder().setColor("Yellow").setDescription(`⚠ You already have a ticket: ${existing}`)],
                    ephemeral: true
                });
            }

            // Create ticket channel
            const ticketChannel = await interaction.guild.channels.create({
                name: `ticket-${interaction.user.id}`,
                type: ChannelType.GuildText,
                permissionOverwrites: [
                    { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }
                ],
                topic: `Category: ${category} | User: ${interaction.user.tag}`
            });

            const ticketEmbed = new EmbedBuilder()
                .setColor("Green")
                .setTitle("🎫 Ticket Created")
                .setDescription(`Hello ${interaction.user}, a staff member will assist you soon.\n\n📌 Category: **${category}**`)
                .setTimestamp();

            const closeButton = new ButtonBuilder()
                .setCustomId("ticket_close")
                .setLabel("🔒 Close Ticket")
                .setStyle(ButtonStyle.Danger);

            await ticketChannel.send({
                content: `<@${interaction.user.id}>`,
                embeds: [ticketEmbed],
                components: [new ActionRowBuilder().addComponents(closeButton)]
            });

            return interaction.reply({
                embeds: [new EmbedBuilder().setColor("Green").setDescription(`✅ Ticket created: ${ticketChannel}`)],
                ephemeral: true
            });
        }

        // -------- Close Ticket --------
        if (interaction.customId === "ticket_close") {
            if (!interaction.channel.name.startsWith("ticket-")) {
                return interaction.reply({
                    embeds: [new EmbedBuilder().setColor("Red").setDescription("❌ This button only works inside a ticket channel.")],
                    ephemeral: true
                });
            }

            await interaction.reply({ content: "🔒 Closing ticket in 5 seconds..." });
            setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
        }
    }
};
