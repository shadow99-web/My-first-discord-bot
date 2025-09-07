const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require("discord.js");

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
                .setDescription("Number of recent messages to scan (max 100)")
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100)
        ),

    async execute({ message, args, interaction, isPrefix }) {
        // Emojis
        const arrow = "<a:flecha:1414301944868245574>";
        const heart = "<a:blue_heart:1414309560231002194>";

        // Context setup
        const channel = isPrefix ? message.channel : interaction.channel;
        const guildMember = isPrefix ? message.member : interaction.member;

        // ✅ Permissions check
        if (!guildMember.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            const replyMsg = "❌ You need the **Manage Messages** permission to use this command!";
            if (isPrefix) return message.reply(replyMsg);
            else return interaction.reply({ content: replyMsg, ephemeral: true });
        }

        // ✅ Target + Amount
        let target, amount;
        if (isPrefix) {
            target = message.mentions.users.first();
            amount = parseInt(args[1]) || 10; // args[0] = mention, args[1] = amount
        } else {
            target = interaction.options.getUser("target");
            amount = interaction.options.getInteger("amount");
        }

        if (!target) {
            const replyMsg = "❌ You must mention a user!";
            if (isPrefix) return message.reply(replyMsg);
            else return interaction.reply({ content: replyMsg, ephemeral: true });
        }

        try {
            // ✅ Fetch + filter messages
            const fetched = await channel.messages.fetch({ limit: amount });
            const userMessages = fetched.filter(m => m.author.id === target.id);

            if (userMessages.size === 0) {
                const replyMsg = `❌ No messages found from **${target.tag}** in the last **${amount}** messages.`;
                if (isPrefix) return message.reply(replyMsg);
                else return interaction.reply({ content: replyMsg, ephemeral: true });
            }

            // ✅ Bulk delete
            await channel.bulkDelete(userMessages, true);

            // ✅ Success Embed
            const embed = new EmbedBuilder()
                .setTitle("🧹 Messages Cleared")
                .setColor("Blue")
                .setDescription(`${arrow} Deleted **${userMessages.size}** message(s) from ${heart} **${target.tag}**`)
                .setTimestamp();

            if (isPrefix) message.reply({ embeds: [embed] });
            else interaction.reply({ embeds: [embed], ephemeral: false });

        } catch (err) {
            const errorEmbed = new EmbedBuilder()
                .setTitle("⚠️ Error")
                .setColor("Red")
                .setDescription(`${arrow} Could not delete messages. They may be older than **14 days**.`)
                .setTimestamp();

            if (isPrefix) message.reply({ embeds: [errorEmbed] });
            else interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    }
};
