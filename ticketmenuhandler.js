// =============================
// 🎟️ Ticket Handler
// =============================
const {
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
    PermissionFlagsBits
} = require("discord.js");

module.exports = function ticketHandler(client) {
    const blueHeart = "<a:blue_heart:1414309560231002194>";

    // 📌 Ticket panel sender
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

    // 🎫 Slash command `/ticket`
    client.on("interactionCreate", async (interaction) => {
        if (interaction.isChatInputCommand() && interaction.commandName === "ticket") {
            await sendTicketPanel(interaction.channel);
            return interaction.reply({ content: "✅ Ticket panel sent!", ephemeral: true });
        }

        // 🎫 Ticket menu selection
        if (interaction.isStringSelectMenu() && interaction.customId === "ticket_menu") {
            const type = interaction.values[0];
            const existing = interaction.guild.channels.cache.find(c => c.name === `ticket-${interaction.user.id}`);
            if (existing) {
                return interaction.reply({ content: "❌ You already have an open ticket!", ephemeral: true });
            }

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
                .setDescription(`${blueHeart} Ticket Type: **${type}**\nWelcome <@${interaction.user.id}>, staff will assist you soon.\nPress 🔒 to close this ticket.`);

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId("ticket_close_button")
                    .setLabel("🔒 Close Ticket")
                    .setStyle(ButtonStyle.Danger)
            );

            await channel.send({ content: `<@${interaction.user.id}>`, embeds: [embed], components: [row] });
            return interaction.reply({ content: `✅ Ticket created: ${channel}`, ephemeral: true });
        }

        // 🔒 Ticket close button
        if (interaction.isButton() && interaction.customId === "ticket_close_button") {
            if (!interaction.channel.name.startsWith("ticket-")) {
                return interaction.reply({ content: "❌ Only usable inside ticket channels.", ephemeral: true });
            }
            await interaction.reply({ content: "🔒 Closing ticket in **5 seconds**..." });
            setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
        }
    });

    // 💬 Prefix command `!ticket`
    client.on("messageCreate", async (message) => {
        if (!message.guild || message.author.bot) return;

        const prefix = "!"; // or use your dynamic prefix system
        if (!message.content.startsWith(prefix)) return;

        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();

        if (commandName === "ticket") {
            await sendTicketPanel(message.channel);
            return message.reply("✅ Ticket panel sent!");
        }
    });
};
