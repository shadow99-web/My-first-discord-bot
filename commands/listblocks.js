const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const fs = require("fs");

const blockedFile = "./blocked.json";
function getBlocked() {
    if (!fs.existsSync(blockedFile)) return {};
    return JSON.parse(fs.readFileSync(blockedFile, "utf8"));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("listblocks")
        .setDescription("📜 Show list of blocked users from using specific commands in this server"),

    async execute({ interaction, message, client, isPrefix }) {
        const blueHeart = "<a:blue_heart_1414309560231002194:1414309560231002194>";
        const guild = interaction ? interaction.guild : message.guild;
        const blocked = getBlocked();

        const blockedUsers = blocked[guild.id] || [];

        const embed = new EmbedBuilder()
            .setColor("Blue")
            .setTitle(`${blueHeart} Blocked Users in ${guild.name}`)
            .setTimestamp();

        if (blockedUsers.length === 0) {
            embed.setDescription("✅ No users are blocked in this server.");
        } else {
            let desc = "";

            for (let i = 0; i < blockedUsers.length; i++) {
                const userId = blockedUsers[i];
                const user = await client.users.fetch(userId).catch(() => null);

                if (user) {
                    desc += `${i + 1}. [${user.username}](https://discord.com/users/${user.id})\n`;
                } else {
                    desc += `${i + 1}. <@${userId}> (\`${userId}\`)\n`;
                }
            }

            embed.setDescription(desc);

            // Optional: set thumbnail if only one user
            if (blockedUsers.length === 1) {
                const user = await client.users.fetch(blockedUsers[0]).catch(() => null);
                if (user) embed.setThumbnail(user.displayAvatarURL({ dynamic: true, size: 128 }));
            }
        }

        if (interaction) {
            await interaction.reply({ embeds: [embed], ephemeral: false });
        } else if (message) {
            await message.reply({ embeds: [embed] });
        }
    }
};
