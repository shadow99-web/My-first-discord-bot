const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("info")
        .setDescription("Get legendary bot info"),

    name: "info",
    description: "Get legendary bot info (prefix + slash)",

    async execute(context) {
        const interaction = context.interaction;
        const message = context.message;
        const client = context.client;

        // Identify caller
        const user = context.isPrefix ? message.author : interaction.user;
        const guild = context.isPrefix ? message.guild : interaction.guild;

        // Stats
        const uptime = formatUptime(client.uptime);
        const serverCount = client.guilds.cache.size;
        const userCount = client.users.cache.size;

        const blueHeart = "<a:blue_heart_1414309560231002194:1414309560231002194>";

        // Build Embed
        const embed = new EmbedBuilder()
            .setAuthor({
                name: `𝙅𝙀𝙀𝙏𝙀𝙉𝘿𝙍𝘼 ❣️`,
                iconURL: user.displayAvatarURL({ dynamic: true })
            })
            .setTitle(`𝙇𝙚𝙜𝙚𝙣𝙙𝙖𝙧𝙮 𝘽𝙤𝙩 𝙄𝙣𝙛𝙤 ${blueHeart}`)
            .setDescription(
                `<:SP_monarch:1428421251856076872> my Lord ${user}!\n\n` +
                `
         ˚꒰ ꒰ 𝗦𝗛𝗔𝗗𝗢𝗪 ˚  ·˚
︶︶︶︶︶︶︶︶︶︶︶︶︶
<a:blue_heart:1414309560231002194> Your Ultimate  **  𝗕𝗢𝗧<a:emoji_79:1424771851342708746> **🎶
**✨ Tired of silence in your server? Bring the vibes alive !
This interactive  bot is built to keep your community moving with the rhythms. **
✯--- ✯--- ⋆⋆ --- ✯ --- ⋆⋆
               <a:heart2:1405233750484451338> Have a pleasurable thank to **${guild.name}** for giving me a home!`
            )
            .addFields(
                { name: " <a:kiddrunk:1438915630148358189> 𝘿𝙀𝙑", value: "JEETENDRA ❤", inline: true },
                { name: "<:reddot:1430434996707000391> 𝙇𝙄𝘽𝙍𝘼𝙍𝙔", value: "Discord.js v14", inline: true },
                { name: "<a:762857525694431243:1405233549950586981> 𝙐𝙋𝙏𝙄𝙈𝙀", value: uptime, inline: true },
                { name: "<a:Gem:1424787118278049813> 𝙎𝙀𝙍𝙑𝙀𝙍𝙎", value: `${serverCount}`, inline: true },
                { name: "<a:vip:1424011747869593673> 𝙐𝙎𝙀𝙍𝙎", value: `${userCount}`, inline: true }
            )
            .setColor("Blue")
            .setFooter({ text: `Serving with honor in ${guild.name}` })
            .setTimestamp();

        // Reply correctly depending on prefix/slash
        if (context.isPrefix) {
            return message.reply({ embeds: [embed] });
        } else {
            return interaction.reply({ embeds: [embed] });
        }
    }
};

// ⏳ Format uptime
function formatUptime(ms) {
    const sec = Math.floor(ms / 1000) % 60;
    const min = Math.floor(ms / (1000 * 60)) % 60;
    const hr = Math.floor(ms / (1000 * 60 * 60)) % 24;
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    return `${days}d ${hr}h ${min}m ${sec}s`;
}
