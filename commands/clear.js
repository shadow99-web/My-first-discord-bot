const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("clear")
        .setDescription("Delete a number of messages")
        .addIntegerOption(option => 
            option.setName("amount")
                  .setDescription("Number of messages to delete")
                  .setRequired(true)
        ),
    async execute(context) {
        let amount;
        if (context.isPrefix) {
            amount = parseInt(context.args[0]);
            if (!amount || amount < 1 || amount > 100) {
                return context.message.reply("❌ Please provide a number between 1 and 100.");
            }
        } else {
            amount = context.interaction.options.getInteger("amount");
        }

        const channel = context.isPrefix ? context.message.channel : context.interaction.channel;

        try {
            const deleted = await channel.bulkDelete(amount, true);
            const embed = new EmbedBuilder()
                .setTitle("🧹 Messages Cleared")
                .setDescription(`Successfully deleted ${deleted.size} messages.`)
                .setColor("Green")
                .setTimestamp();

            if (context.isPrefix) await context.message.reply({ embeds: [embed] });
            else await context.interaction.reply({ embeds: [embed] });
        } catch (err) {
            console.error(err);
            const msg = "❌ Could not delete messages. Make sure they are not older than 14 days.";
            if (context.isPrefix) await context.message.reply(msg);
            else await context.interaction.reply({ content: msg, ephemeral: true });
        }
    }
};
