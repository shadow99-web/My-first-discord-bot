const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('listusers')
        .setDescription('Lists all users in a specific role with pagination.'),

    async execute(interaction) {
        // Replace 'WARRIORS' with your role name or fetch dynamically
        const roleName = 'WARRIORS';
        const role = interaction.guild.roles.cache.find(r => r.name === roleName);
        if (!role) return interaction.reply({ content: `Role "${roleName}" not found!`, ephemeral: true });

        // Fetch all members with the role
        await interaction.guild.members.fetch(); // ensures all members are cached
        const members = role.members.map(m => `:blue_heart_1414309560231002194: ${m.user} (@${m.user.username})`);

        if (members.length === 0) return interaction.reply({ content: `No users found in ${roleName}.`, ephemeral: true });

        const pageSize = 10; // users per page
        const totalPages = Math.ceil(members.length / pageSize);
        let currentPage = 0;

        const generateEmbed = (page) => {
            const start = page * pageSize;
            const end = start + pageSize;
            return new EmbedBuilder()
                .setTitle(`Users in ${roleName}`)
                .setDescription(members.slice(start, end).join('\n'))
                .setFooter({ text: `Page ${page + 1}/${totalPages}` });
        };

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('prev')
                .setLabel('⬅️ Previous')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(true),
            new ButtonBuilder()
                .setCustomId('next')
                .setLabel('Next ➡️')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(totalPages <= 1)
        );

        const message = await interaction.reply({ embeds: [generateEmbed(currentPage)], components: [row], fetchReply: true });

        const collector = message.createMessageComponentCollector({ time: 60000 });

        collector.on('collect', async (i) => {
            if (i.user.id !== interaction.user.id) return i.reply({ content: 'These buttons are not for you!', ephemeral: true });

            if (i.customId === 'next') currentPage++;
            if (i.customId === 'prev') currentPage--;

            row.components[0].setDisabled(currentPage === 0);
            row.components[1].setDisabled(currentPage === totalPages - 1);

            await i.update({ embeds: [generateEmbed(currentPage)], components: [row] });
        });

        collector.on('end', async () => {
            row.components.forEach(button => button.setDisabled(true));
            await interaction.editReply({ components: [row] });
        });
    }
};
