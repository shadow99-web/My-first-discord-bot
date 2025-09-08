const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("info")
        .setDescription("Get legendary bot info"),

    async execute(context) {
        const blueHeart = "<a:blue_heart_1414309560231002194:1414309560231002194>";
        const interaction = context.interaction;
        const message = context.message;

        // Who called the command
        const user = context.isPrefix ? message.author : interaction.user;
        const guild = context.isPrefix ? message.guild : interaction.guild;

        // Bot stats
        const uptime = formatUptime(context.client.uptime);
        const serverCount = context.client.guilds.cache.size;
        const userCount = context.client.users.cache.size;

        const embed = new EmbedBuilder()
            .setAuthor({ 
                name: `👑 JEETENDRA ❤ - Legendary Developer`, 
                iconURL: user.displayAvatarURL({ dynamic: true }) 
            })
            .setTitle(`💖 Legendary Bot Information ${blueHeart}`)
            .setDescription(
                `Greetings ${user}!\n\n` +
                `I am not just a bot, I am a **legendary companion** forged to protect, entertain, and empower communities. ${blueHeart}\n\n` +
                `From managing chaos ⚡ to spreading joy 🎉, I serve with honor and style.\n\n` +
                `✨ Special thanks to **${guild.name}** for giving me a home!`
            )
            .addFields(
                { name: "👑 Developer", value: "JEETENDRA ❤", inline: true },
                { name: "📜 Library", value: "Discord.js v14", inline: true },
                { name: "❤‍🩹 Status", value: "Active and Legendary", inline: true },
                { name: "✨ Uptime", value: uptime, inline: true },
                { name: "🥂 Servers", value: `${serverCount}`, inline: true },
                { name: "🤝 Users", value: `${userCount}`, inline: true }
            )
            .setColor("Blue")
            .setFooter({ 
                text: `${blueHeart} Serving with honor in ${guild.name} ${blueHeart}` 
            })
            .setTimestamp();

        if (context.isPrefix) {
            await message.reply({ embeds: [embed] });
        } else {
            await interaction.reply({ embeds: [embed] });
        }
    }
};

// Helper function to format uptime
function formatUptime(ms) {
    const seconds = Math.floor(ms / 1000) % 60;
    const minutes = Math.floor(ms / (1000 * 60)) % 60;
    const hours = Math.floor(ms / (1000 * 60 * 60)) % 24;
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
                                     }
