const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

const heart = "<a:blue_heart:1414309560231002194>";

module.exports = {
    data: new SlashCommandBuilder()
        .setName("listbots")
        .setDescription("Show all bots in this server with pagination"),

    async execute({ message, interaction, isPrefix }) {
        const guild = isPrefix ? message.guild : interaction.guild;
        const bots = guild.members.cache.filter(m => m.user.bot);

        if (bots.size === 0) {
            const replyMsg = "❌ No bots found in this server!";
            if (isPrefix) return message.reply(replyMsg);
            else return interaction.reply({ content: replyMsg, ephemeral: true });
        }

        const botArray = [...bots.values()];
        const chunkSize = 10;
        const pages = [];

        for (let i = 0; i < botArray.length; i += chunkSize) {
            const chunk = botArray.slice(i, i + chunkSize);
            const embed = new EmbedBuilder()
                .setTitle(`${heart} Bots in ${guild.name}`)
                .setColor("Blue")
                .setThumbnail(guild.iconURL({ dynamic: true }) || null)
                .setTimestamp();

            chunk.forEach((bot, idx) => {
                embed.addFields({
                    name: `${heart} ${i + idx + 1}. ${bot.user.tag}`,
                    value: `👤 Mention: <@${bot.id}>\n🆔 ID: \`${bot.id}\`\n📅 Joined: <t:${Math.floor(bot.joinedTimestamp / 1000)}:R>`,
                    inline: false
                });
            });

            pages.push(embed);
        }

        let currentPage = 0;

        // Initial button row with Stop
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("prev").setLabel("⬅️ Prev").setStyle(ButtonStyle.Primary).setDisabled(true),
            new ButtonBuilder().setCustomId("stop").setLabel("🛑 Stop").setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId("next").setLabel("Next ➡️").setStyle(ButtonStyle.Primary).setDisabled(pages.length === 1)
        );

        const replyTarget = isPrefix ? message : interaction;
        const replyMethod = isPrefix ? "reply" : "reply";

        const reply = await replyTarget[replyMethod]({
            embeds: [pages[currentPage]],
            components: [row]
        });

        // Collector for button interactions
        const collector = reply.createMessageComponentCollector({ time: 60000 });

        collector.on("collect", async (i) => {
            if (i.user.id !== (isPrefix ? message.author.id : interaction.user.id)) {
                return i.reply({ content: "❌ Only the command user can use these buttons.", ephemeral: true });
            }

            if (i.customId === "prev" && currentPage > 0) currentPage--;
            if (i.customId === "next" && currentPage < pages.length - 1) currentPage++;
            if (i.customId === "stop") {
                collector.stop("stopped");
                return i.update({ content: "🛑 Pagination stopped.", embeds: [pages[currentPage]], components: [] });
            }

            const newRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId("prev").setLabel("⬅️ Prev").setStyle(ButtonStyle.Primary).setDisabled(currentPage === 0),
                new ButtonBuilder().setCustomId("stop").setLabel("🛑 Stop").setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId("next").setLabel("Next ➡️").setStyle(ButtonStyle.Primary).setDisabled(currentPage === pages.length - 1)
            );

            await i.update({ embeds: [pages[currentPage]], components: [newRow] });
        });

        collector.on("end", async (collected, reason) => {
            if (reason === "stopped") return; // user pressed stop
            const disabledRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId("prev").setLabel("⬅️ Prev").setStyle(ButtonStyle.Secondary).setDisabled(true),
                new ButtonBuilder().setCustomId("stop").setLabel("🛑 Stop").setStyle(ButtonStyle.Secondary).setDisabled(true),
                new ButtonBuilder().setCustomId("next").setLabel("Next ➡️").setStyle(ButtonStyle.Secondary).setDisabled(true)
            );
            await reply.edit({ components: [disabledRow] }).catch(() => {});
        });
    }
};
