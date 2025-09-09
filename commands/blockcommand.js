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

const devID = process.env.DEV_ID; // 🔑 cannot be blocked

module.exports = {
    data: new SlashCommandBuilder()
        .setName("block")
        .setDescription("Block a user from all or specific commands")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addUserOption(option =>
            option.setName("user")
                .setDescription("The user to block")
                .setRequired(true))
        .addStringOption(option =>
            option.setName("command")
                .setDescription("Optional command name to block (leave empty = all commands)")),

    async execute({ interaction }) {
        const user = interaction.options.getUser("user");
        const commandName = interaction.options.getString("command");
        const guildId = interaction.guild.id;

        if (user.id === devID) {
            return interaction.reply({ content: "🚫 You cannot block the developer!", ephemeral: true });
        }

        const blocked = getBlocked();
        if (!blocked[guildId]) blocked[guildId] = {};

        if (!blocked[guildId][user.id]) blocked[guildId][user.id] = [];

        if (commandName) {
            if (!blocked[guildId][user.id].includes(commandName)) {
                blocked[guildId][user.id].push(commandName);
            }
        } else {
            blocked[guildId][user.id] = ["*"]; // full block
        }

        saveBlocked(blocked);

        const embed = new EmbedBuilder()
            .setColor("Red")
            .setTitle("🔒 User Blocked")
            .setDescription(`${user} has been blocked ${commandName ? `from \`${commandName}\`` : "from **all commands**"}.`)
            .setThumbnail(user.displayAvatarURL({ dynamic: true }))
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
