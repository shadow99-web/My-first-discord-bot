// =============================
// 🎟️ Ticket Command (Slash + Prefix support)
// =============================
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ticket")
        .setDescription("🎫 Open the ticket help panel"),

    async execute({ message, interaction, client, isPrefix }) {
        // Determine the user who invoked
        const user = isPrefix ? message.author : interaction.user;
        const channel = isPrefix ? message.channel : interaction.channel;

        // Send the ticket panel
        await module.exports.sendTicketPanel(channel, user);
        
        // Confirm to user
        if (isPrefix) {
            await message.reply("<a:purple_verified:1439271259190988954> Ticket panel sent!");
        } else {
            await interaction.reply({ content: "<a:purple_verified:1439271259190988954> Ticket panel sent!", ephemeral: true });
        }
    },

    // Function to send the ticket panel
    sendTicketPanel: async (channel, user) => {
        const embed = new EmbedBuilder()
            .setColor("Blue")
            .setTitle("<a:Gem:1424787118278049813> Ticket Panel")
            .setDescription(`Hello <@${user.id}>! Please select a ticket category from the menu below.`);

        const row = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId("ticket_menu")
                .setPlaceholder("Select a ticket category")
                .addOptions([
                    {
                        label: "GENERAL SUPPORT",
                        value: "general_support",
                        description: "Get help with general questions or issues",
                        emoji: "<a:blue_heart:1414309560231002194>" // animated emoji IDs can't be directly used in select menus; Discord will convert 💙 to the blue heart if animated in your server
                    },
                    {
                        label: "APPEAL BAN FOR A MEMBER/MEMBERS",
                        value: "appeal_ban",
                        description: "Submit a ban appeal for yourself or another member",
                        emoji: "<a:hehehe:1401554249455898716>"
                    },
                    {
                        label: "APPEAL TO BE STAFF",
                        value: "appeal_staff",
                        description: "Apply to become staff on this server",
                        emoji: "<a:lyf_kat_rave:1440376954531352677>"
                    },
                    {
                        label: "REPORT A MEMBER",
                        value: "report_member",
                        description: "Report a member for misconduct",
                        emoji: "<a:alert:1439611767302127788>"
                    }
                ])
        );

        await channel.send({ content: `<@${user.id}>`, embeds: [embed], components: [row] });
    }
};
