const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("serverinfo")
        .setDescription("Get detailed information about this server"),

    name: "serverinfo",
    description: "Get detailed information about this server",

    async execute({ interaction, message, client }) {
        const guild = interaction?.guild || message.guild;
        const owner = await guild.fetchOwner();

        const createdTimestamp = `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`;
        const memberCount = guild.memberCount;
        const boostCount = guild.premiumSubscriptionCount;
        const boostLevel = guild.premiumTier;

        const roles = guild.roles.cache.size;
        const channels = guild.channels.cache.size;
        const textChannels = guild.channels.cache.filter(c => c.type === 0).size;
        const voiceChannels = guild.channels.cache.filter(c => c.type === 2).size;
        const emojis = guild.emojis.cache.size;
        const stickers = guild.stickers.cache.size;

        const iconURL = guild.iconURL({ dynamic: true, size: 1024 });
        const bannerURL = guild.bannerURL({ size: 2048 });
        const splashURL = guild.splashURL({ size: 2048 });
        const discoverySplashURL = guild.discoverySplashURL({ size: 2048 });

        const embed = new EmbedBuilder()
            .setColor("Blue")
            .setAuthor({
                name: `${guild.name} - Server Information`,
                iconURL: iconURL
            })
            .setThumbnail(iconURL)
            .addFields(
                { name: "<a:blue_heart:1414309560231002194> Server Name", value: guild.name, inline: true },
                { name: "Server ID", value: guild.id, inline: true },
                { name: " Owner", value: `${owner.user.tag}`, inline: true },

                { name: " Created", value: createdTimestamp, inline: true },
                { name: " Members", value: `${memberCount}`, inline: true },
                { name: "<a:blue_heart:1414309560231002194> Boosts", value: `${boostCount} (Level ${boostLevel})`, inline: true },

                { name: " Roles", value: `${roles}`, inline: true },
                { name: "Text Channels", value: `${textChannels}`, inline: true },
                { name: "🎙 Voice Channels", value: `${voiceChannels}`, inline: true },

                { name: " Emojis", value: `${emojis}`, inline: true },
                { name: " Stickers", value: `${stickers}`, inline: true },
                { name: "<a:blue_heart:1414309560231002194> Verification Level", value: `${guild.verificationLevel}`, inline: true }
            )
            .setFooter({
                text: `Requested by ${interaction?.user?.tag || message.author.tag}`,
                iconURL: (interaction?.user || message.author).displayAvatarURL({ dynamic: true })
            })
            .setTimestamp();

        // Attach banner / splash if they exist
        if (bannerURL) embed.addFields({ name: "🏞️ Banner", value: `[Click Here](${bannerURL})` });
        if (splashURL) embed.addFields({ name: "🌊 Invite Splash", value: `[Click Here](${splashURL})` });
        if (discoverySplashURL) embed.addFields({ name: "✨ Discovery Splash", value: `[Click Here](${discoverySplashURL})` });

        if (interaction) {
            await interaction.reply({ embeds: [embed] });
        } else if (message) {
            await message.reply({ embeds: [embed] });
        }
    }
};
