const { SlashCommandBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("clearuser")
        .setDescription("Delete messages of a specific user in this channel")
        .addUserOption(option =>
            option.setName("target")
                .setDescription("Select the user whose messages will be deleted")
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option.setName("amount")
                .setDescription("Number of messages to check (max 100)")
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100)),
    async execute({ message, args, interaction, isPrefix }) {
        const arrow = ":flecha_1414301944868245574:";
        const channel = isPrefix ? message.channel : interaction.channel;
        const guildMember = isPrefix ? message.member : interaction.member;

        // Check permissions
        if (!guildMember.permissions.has("ManageMessages")) {
            const replyMsg = "❌ You need the Manage Messages permission to use this command!";
            if (isPrefix) return message.reply(replyMsg);
            else return interaction.reply({ content: replyMsg, ephemeral: true });
        }

        const target = isPrefix
            ? message.mentions.users.first()
            : interaction.options.getUser("target");
        const amount = isPrefix
            ? parseInt(args[0]) || 10
            : interaction.options.getInteger("amount");

        if (!target) {
            const replyMsg = "❌ You must mention a user!";
            if (isPrefix) return message.reply(replyMsg);
            else return interaction.reply({ content: replyMsg, ephemeral: true });
        }

        // Fetch messages and filter by target
        const fetched = await channel.messages.fetch({ limit: amount });
        const userMessages = fetched.filter(m => m.author.id === target.id);

        if (userMessages.size === 0) {
            const replyMsg = `❌ No messages found from ${target.tag} in the last ${amount} messages.`;
            if (isPrefix) return message.reply(replyMsg);
            else return interaction.reply({ content: replyMsg, ephemeral: true });
        }

        await channel.bulkDelete(userMessages, true);

        const successMsg = `${arrow} Deleted ${userMessages.size} message(s) from ${target.tag}`;
        if (isPrefix) message.reply(successMsg);
        else interaction.reply({ content: successMsg, ephemeral: false });
    }
};
