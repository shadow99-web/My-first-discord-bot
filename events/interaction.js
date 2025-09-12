const { EmbedBuilder, ChannelType, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

module.exports = (client, blockHelpers) => {
    client.on("interactionCreate", async (interaction) => {
        // ---------- Slash Command Handling ----------
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) return;

            if (blockHelpers.isBlocked(interaction.user.id, interaction.guildId, interaction.commandName)) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("Red")
                            .setTitle("🚫 Command Blocked")
                            .setDescription(`You are blocked from using \`${interaction.commandName}\``)
                    ],
                    ephemeral: true
                });
            }

            try { 
                await command.execute({ interaction, client, isPrefix: false }); 
            } catch (err) { 
                console.error(err); 
                interaction.reply({ content: "❌ Something went wrong!", ephemeral: true }).catch(() => {}); 
            }
        }

        // ---------- Ticket Select Menu ----------
        if (interaction.isStringSelectMenu() && interaction.customId === "ticket_menu") {
            const type = interaction.values[0];
            const existing = interaction.guild.channels.cache.find(c => c.name === `ticket-${interaction.user.id}`);
            if (existing) return interaction.reply({ content: "❌ You already have an open ticket!", ephemeral: true });

            // Get all staff/admin roles (adjust as needed)
            const staffRoles = interaction.guild.roles.cache.filter(r => r.permissions.has(PermissionFlagsBits.ManageGuild));

            const permissionOverwrites = [
                { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] }, // hide from everyone
                { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] } // allow ticket creator
            ];

            // allow staff roles
            staffRoles.forEach(role => {
                permissionOverwrites.push({ id: role.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] });
            });

            const channel = await interaction.guild.channels.create({
                name: `ticket-${interaction.user.id}`,
                type: ChannelType.GuildText,
                permissionOverwrites
            });

            const embed = new EmbedBuilder()
                .setColor("Blue")
                .setAuthor({ name: `${interaction.user.username}'s Ticket 💙`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
                .setDescription(`🎟️ Ticket Type: **${type.toUpperCase()}**\nWelcome <@${interaction.user.id}>, staff will assist you soon.\nPress 🔒 to close.`);

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId("ticket_close_button")
                    .setLabel("🔒 Close Ticket")
                    .setStyle(ButtonStyle.Danger)
            );

            await channel.send({ content: `<@${interaction.user.id}>`, embeds: [embed], components: [row] });
            return interaction.reply({ content: `✅ Ticket created: ${channel}`, ephemeral: true });
        }

        // ---------- Close Ticket Button ----------
        if (interaction.isButton() && interaction.customId === "ticket_close_button") {
            if (!interaction.channel.name.startsWith("ticket-")) 
                return interaction.reply({ content: "❌ Only usable inside ticket channels.", ephemeral: true });

            await interaction.reply({ content: "🔒 Closing ticket in **5 seconds**..." });
            setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
        }
    });
};
