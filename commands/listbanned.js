const {
    SlashCommandBuilder,
    EmbedBuilder,
    PermissionFlagsBits,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("listbanned")
        .setDescription("Shows a paginated list of banned users")
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    usage: "!listbanned",
    description: "View all banned users with interactive pagination",

    async execute({ message, interaction, client, args, isPrefix }) {
        const guild = interaction?.guild ?? message.guild;
        const blueHeart = "<a:blue_heart:1414309560231002194>";

        try {
            const bans = await guild.bans.fetch();

            if (bans.size === 0) {
                return isPrefix
                    ? message.reply("✅ No banned users in this server.")
                    : interaction.reply({
                          content: "✅ No banned users in this server.",
                          ephemeral: true,
                      });
            }

            // Format each ban entry
            const banEntries = bans.map(
                (b) =>
                    `${blueHeart} **${b.user.tag}** (ID: ${b.user.id})\n${
                        b.reason ? `❓ Reason: ${b.reason}` : "📝 Reason: None"
                    }`
            );

            // Split into chunks of 10 bans per page
            const pages = [];
            for (let i = 0; i < banEntries.length; i += 10) {
                pages.push(banEntries.slice(i, i + 10).join("\n\n"));
            }

            let page = 0;

            const getEmbed = (pageIndex) =>
                new EmbedBuilder()
                    .setColor("Blue")
                    .setTitle(" List of Banned Users")
                    .setDescription(pages[pageIndex])
                    .setFooter({
                        text: `Page ${pageIndex + 1}/${pages.length} • Total: ${bans.size}`,
                    })
                    .setTimestamp();

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId("first")
                    .setLabel("⏮")
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId("prev")
                    .setLabel("◀")
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId("next")
                    .setLabel("▶")
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId("last")
                    .setLabel("⏭")
                    .setStyle(ButtonStyle.Secondary)
            );

            // Initial reply
            const sent = isPrefix
                ? await message.reply({ embeds: [getEmbed(page)], components: [row] })
                : await interaction.reply({
                      embeds: [getEmbed(page)],
                      components: [row],
                      fetchReply: true,
                  });

            // Collector for button clicks
            const collector = sent.createMessageComponentCollector({
                time: 60_000, // 1 min
            });

            collector.on("collect", async (btn) => {
                if (btn.user.id !== (interaction?.user.id ?? message.author.id)) {
                    return btn.reply({
                        content: "❌ Only the command user can control this.",
                        ephemeral: true,
                    });
                }

                if (btn.customId === "first") page = 0;
                if (btn.customId === "prev") page = page > 0 ? page - 1 : pages.length - 1;
                if (btn.customId === "next") page = page + 1 < pages.length ? page + 1 : 0;
                if (btn.customId === "last") page = pages.length - 1;

                await btn.update({
                    embeds: [getEmbed(page)],
                    components: [row],
                });
            });

            collector.on("end", async () => {
                // Disable buttons after timeout
                const disabledRow = new ActionRowBuilder().addComponents(
                    row.components.map((c) => ButtonBuilder.from(c).setDisabled(true))
                );

                await sent.edit({
                    components: [disabledRow],
                });
            });
        } catch (err) {
            console.error(err);
            return isPrefix
                ? message.reply("❌ Failed to fetch banned users. Do I have `BanMembers` permission?")
                : interaction.reply({
                      content:
                          "❌ Failed to fetch banned users. Make sure I have the `BanMembers` permission.",
                      ephemeral: true,
                  });
        }
    },
};
