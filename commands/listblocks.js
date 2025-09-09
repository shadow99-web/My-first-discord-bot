const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const fs = require("fs");

// Helper to get blocked users
const blockedFile = "./blocked.json";
const getBlocked = () => {
    if (!fs.existsSync(blockedFile)) fs.writeFileSync(blockedFile, "{}");
    return JSON.parse(fs.readFileSync(blockedFile, "utf8"));
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName("listblocks")
        .setDescription("Shows all blocked users in this server from specific commands"),

    async execute({ interaction, message, client, isPrefix }) {
        const user = interaction?.user || message.author;

        // Only admins or DEV_ID can use
        if (!user.id === process.env.DEV_ID && !user.permissions?.has?.("Administrator") && !message?.member?.permissions?.has("Administrator")) {
            const replyEmbed = new EmbedBuilder()
                .setColor("Red")
                .setTitle("❌ Permission Denied")
                .setDescription("Only admins or the bot developer can use this command.");
            if (isPrefix) return message.reply({ embeds: [replyEmbed] }).catch(() => {});
            else return interaction.reply({ embeds: [replyEmbed], ephemeral: true });
        }

        const blocked = getBlocked();
        const guildBlocked = blocked[interaction?.guildId || message.guild.id] || [];

        if (guildBlocked.length === 0) {
            const emptyEmbed = new EmbedBuilder()
                .setColor("Yellow")
                .setTitle("No blocked users")
                .setDescription("There are currently no users blocked in this server.");
            if (isPrefix) return message.reply({ embeds: [emptyEmbed] }).catch(() => {});
            else return interaction.reply({ embeds: [emptyEmbed], ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setColor("Blue")
            .setTitle(`🚫 Blocked Users (${guildBlocked.length})`)
            .setDescription(
                await Promise.all(
                    guildBlocked.map(async (id, index) => {
                        try {
                            const member = await (interaction?.guild || message.guild).members.fetch(id);
                            return `${index + 1}. ${member.user.tag}`;
                        } catch {
                            return `${index + 1}. Unknown User (ID: ${id})`;
                        }
                    })
                ).then(arr => arr.join("\n"))
            )
            .setTimestamp();

        if (isPrefix) message.reply({ embeds: [embed] }).catch(() => {});
        else interaction.reply({ embeds: [embed], ephemeral: true });
    }
};
