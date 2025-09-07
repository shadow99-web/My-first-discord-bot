const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("lock")
        .setDescription("Lock or unlock the current channel")
        .addBooleanOption(option =>
            option.setName("lock")
                  .setDescription("true = lock, false = unlock")
                  .setRequired(true)
        ),
    async execute(context) {
        const channel = context.isPrefix ? context.message.channel : context.interaction.channel;
        const guildMember = context.isPrefix ? context.message.member : context.interaction.member;

        if (!guildMember.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
            const msg = "❌ You need `Manage Channels` permission to use this command.";
            if (context.isPrefix) return context.message.reply(msg);
            else return context.interaction.reply({ content: msg, ephemeral: true });
        }

        let lockState;
        if (context.isPrefix) {
            const arg = context.args[0]?.toLowerCase();
            if (!arg || !["lock","unlock"].includes(arg)) {
                return context.message.reply("❌ Usage: !lock lock OR !lock unlock");
            }
            lockState = arg === "lock";
        } else {
            lockState = context.interaction.options.getBoolean("lock");
        }

        try {
            await channel.permissionOverwrites.edit(channel.guild.roles.everyone, {
                SendMessages: !lockState
            });

            const embed = new EmbedBuilder()
                .setTitle(lockState ? "🔒 Channel Locked" : "🔓 Channel Unlocked")
                .setColor(lockState ? "Red" : "Green")
                .setTimestamp();

            if (context.isPrefix) await context.message.reply({ embeds: [embed] });
            else await context.interaction.reply({ embeds: [embed] });
        } catch (err) {
            console.error(err);
            const msg = "❌ Failed to update channel permissions.";
            if (context.isPrefix) await context.message.reply(msg);
            else await context.interaction.reply({ content: msg, ephemeral: true });
        }
    }
};
