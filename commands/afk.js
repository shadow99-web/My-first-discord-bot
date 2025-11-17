const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("afk")
        .setDescription("Set your AFK status with an optional reason")
        .addStringOption(option =>
            option.setName("reason")
                .setDescription("Reason for going AFK")
                .setRequired(false)
        ),

    async execute({ message, interaction, isPrefix, client, args }) {
        try {
            const blueHeart = "<a:blue_heart:1414309560231002194>";
            const user = isPrefix ? message.author : interaction.user;

            // ✅ Fallback for reason
            const reason = isPrefix
                ? (args.join(" ") || "No reason provided")
                : (interaction?.options?.getString("reason") || "No reason provided");

            // ✅ Ensure AFK map always exists
            if (!client.afk) client.afk = new Map();

            // ✅ Store AFK data safely
            client.afk.set(user.id, { reason, since: Date.now(), mentions: [] });

            // ✅ Build embed
            const embed = new EmbedBuilder()
                .setColor("Blue")
                .setAuthor({
                    name: `<a:presence_single:1439950517651640415> ${user.tag} is now AFK`,
                    iconURL: user.displayAvatarURL({ dynamic: true })
                })
                .setDescription(`${blueHeart} Reason: **${reason}**`)
                .setTimestamp();

            // ✅ Reply safely (prefix or slash)
            if (isPrefix) {
                await message.reply({ embeds: [embed] }).catch(() => {});
            } else {
                await interaction.reply({ embeds: [embed] }).catch(() => {});
            }
        } catch (err) {
            console.error("❌ AFK command failed:", err);

            // ✅ Fail gracefully
            if (isPrefix) {
                message.reply("❌ Something went wrong setting AFK.").catch(() => {});
            } else {
                interaction.reply({ content: "❌ Something went wrong setting AFK.", ephemeral: true }).catch(() => {});
            }
        }
    }
};
