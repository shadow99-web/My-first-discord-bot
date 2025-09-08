const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("blockcommand")
        .setDescription("Block a user from using a specific command.")
        .addUserOption(opt =>
            opt.setName("user").setDescription("User to block").setRequired(true))
        .addStringOption(opt =>
            opt.setName("command").setDescription("Command to block").setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    name: "blockcommand",
    description: "Block a user from using a specific command.",

    async execute({ interaction, message, args, client, isPrefix }) {
        const blueHeart = "<a:blue_heart_1414309560231002194:1414309560231002194>";

        // Get target + command name
        const user = interaction ? interaction.options.getUser("user") : message.mentions.users.first();
        const commandName = interaction ? interaction.options.getString("command") : args[1];
        if (!user || !commandName) {
            const reply = "❌ Please provide a user and a command name.";
            return interaction ? interaction.reply({ content: reply, ephemeral: true }) : message.reply(reply);
        }

        // Save in Map
        if (!client.commandBlocks) client.commandBlocks = new Map();
        const key = `${interaction?.guildId || message.guild.id}-${user.id}-${commandName.toLowerCase()}`;
        client.commandBlocks.set(key, true);

        const embed = new EmbedBuilder()
            .setColor("Blue")
            .setDescription(`${blueHeart} 🚫 ${user} is now **blocked** from using \`${commandName}\``)
            .setTimestamp();

        return interaction ? interaction.reply({ embeds: [embed] }) : message.reply({ embeds: [embed] });
    }
};
