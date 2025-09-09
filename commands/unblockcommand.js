const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const fs = require("fs");

const blockedFile = "./blocked.json";
if (!fs.existsSync(blockedFile)) fs.writeFileSync(blockedFile, "{}");

function getBlocked() {
    return JSON.parse(fs.readFileSync(blockedFile, "utf8"));
}
function saveBlocked(data) {
    fs.writeFileSync(blockedFile, JSON.stringify(data, null, 4));
}

const devID = process.env.DEV_ID;

module.exports = {
    data: new SlashCommandBuilder()
        .setName("unblock")
        .setDescription("Unblock a user from all or specific commands")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addUserOption(option =>
            option.setName("user")
                .setDescription("The user to unblock")
                .setRequired(true))
        .addStringOption(option =>
            option.setName("command")
                .setDescription("Optional command name to unblock (leave empty = all commands)")),

    async execute({ interaction }) {
        const user = interaction.options.getUser("user");
        const commandName = interaction.options.getString("command");
        const guildId = interaction.guild.id;

        if (user.id === devID) {
            return interaction.reply({ content: "🚫 The developer cannot be blocked/unblocked by others.", ephemeral: true });
        }

        const blocked = getBlocked();
        if (!blocked[guildId] || !blocked[guildId][user.id]) {
            return interaction.reply({ content: "⚠️ This user is not blocked.", ephemeral: true });
        }

        if (commandName) {
            blocked[guildId][user.id] = blocked[guildId][user.id].filter(cmd => cmd !== commandName);
            if (blocked[guildId][user.id].length === 0) delete blocked[guildId][user.id];
        } else {
            delete blocked[guildId][user.id];
        }

        saveBlocked(blocked);

        const embed = new EmbedBuilder()
            .setColor("Green")
            .setTitle("🔓 User Unblocked")
            .setDescription(`${user} has been unblocked ${commandName ? `from \`${commandName}\`` : "from **all commands**"}.`)
            .setThumbnail(user.displayAvatarURL({ dynamic: true }))
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
