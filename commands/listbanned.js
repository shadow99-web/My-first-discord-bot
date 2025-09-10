const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("listbanned")
        .setDescription("Shows a list of banned users in this server")
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    async execute({ message, interaction, client, args, isPrefix }) {
        const guild = interaction?.guild ?? message.guild;
        const blueHeart = "<a:blue_heart:1414309560231002194>";

        try {
            const bans = await guild.bans.fetch();

            if (bans.size === 0) {
                return isPrefix
                    ? message.reply("✅ No banned users in this server.")
                    : interaction.reply({ content: "✅ No banned users in this server.", ephemeral: true });
            }

            // Format ban list with optional reason
            const banList = bans.map(b => 
                `${blueHeart} **${b.user.tag}** (ID: ${b.user.id})${b.reason ? `\n📝 Reason: ${b.reason}` : ""}`
            ).join("\n\n");

            const embed = new EmbedBuilder()
                .setColor("Blue")
                .setTitle(" List of Banned Users")
                .setDescription(banList.length > 4000 ? banList.slice(0, 4000) + "\n...and more" : banList)
                .setFooter({ text: `Total Banned Users: ${bans.size}` })
                .setTimestamp();

            if (isPrefix) message.reply({ embeds: [embed] });
            else interaction.reply({ embeds: [embed] });

        } catch (err) {
            console.error(err);
            return isPrefix
                ? message.reply("❌ Failed to fetch banned users.")
                : interaction.reply({ content: "❌ Failed to fetch banned users.", ephemeral: true });
        }
    }
};
