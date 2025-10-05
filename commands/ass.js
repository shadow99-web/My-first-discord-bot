const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const axios = require("axios");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ass")
        .setDescription("Displays a NSFW ass image (NSFW channel required)"),

    async execute(context) {
        const isSlash = !context.isPrefix;
        const channel = isSlash ? context.interaction.channel : context.message.channel;
        const user = isSlash ? context.interaction.user : context.message.author;

        // Check NSFW channel
        if (!channel.nsfw) {
            const embed = new EmbedBuilder()
                .setTitle('❌ Not NSFW channel')
                .setDescription('> *This command can only be used in NSFW channels.*')
                .setFooter({ text: user.username, iconURL: user.displayAvatarURL({ dynamic: true }) })
                .setColor('Red')
                .setTimestamp();

            if (isSlash) return context.interaction.reply({ embeds: [embed], ephemeral: true });
            return context.message.reply({ embeds: [embed] });
        }

        try {
            const response = await axios.get('https://nekobot.xyz/api/image?type=ass');

            const embed = new EmbedBuilder()
                .setTitle('🔞 NSFW Ass Image')
                .setImage(response.data.message)
                .setFooter({ text: channel.guild ? channel.guild.name : "DM", iconURL: channel.guild?.iconURL({ dynamic: true }) })
                .setColor(Math.floor(Math.random() * 16777215).toString(16))
                .setTimestamp();

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setEmoji('📎')
                    .setLabel('Link')
                    .setStyle(ButtonStyle.Link)
                    .setURL(response.data.message)
            );

            if (isSlash) await context.interaction.reply({ embeds: [embed], components: [row] });
            else await context.message.reply({ embeds: [embed], components: [row] });

        } catch {
            const embed = new EmbedBuilder()
                .setTitle('❌ Error occurred')
                .setDescription('> *An error occurred while fetching the image. Please try again later.*')
                .setFooter({ text: user.username, iconURL: user.displayAvatarURL({ dynamic: true }) })
                .setColor('Red')
                .setTimestamp();

            if (isSlash) await context.interaction.reply({ embeds: [embed], ephemeral: true });
            else await context.message.reply({ embeds: [embed] });
        }
    }
};
