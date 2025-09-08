const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require("discord.js");
const heart = "<a:blue_heart:1414309560231002194>";

module.exports = {
    data: new SlashCommandBuilder()
        .setName("listadmins")
        .setDescription("Show all admins in this server"),

    async execute({ message, interaction, isPrefix }) {
        const guild = isPrefix ? message.guild : interaction.guild;
        const admins = guild.members.cache.filter(m => m.permissions.has(PermissionFlagsBits.Administrator));

        if (admins.size === 0) {
            const replyMsg = "❌ No admins found!";
            return isPrefix ? message.reply(replyMsg) : interaction.reply({ content: replyMsg, ephemeral: true });
        }

        const list = admins.map(m => `${heart} ${m.user.tag} (<@${m.id}>)`);
        const pageSize = 10;
        let page = 0;

        const generateEmbed = (p) => {
            const start = p * pageSize;
            const end = start + pageSize;
            const current = list.slice(start, end);

            return new EmbedBuilder()
                .setTitle(`${heart} Admins in ${guild.name}`)
                .setColor("Blue")
                .setDescription(current.join("\n"))
                .setFooter({ text: `Page ${p + 1}/${Math.ceil(list.length / pageSize)}` })
                .setTimestamp();
        };

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("prev").setLabel("⬅️").setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId("stop").setLabel("🛑").setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId("next").setLabel("➡️").setStyle(ButtonStyle.Primary)
        );

        const replyOptions = { embeds: [generateEmbed(page)], components: [row] };
        const msg = isPrefix ? await message.reply(replyOptions) : await interaction.reply({ ...replyOptions, fetchReply: true });

        const collector = msg.createMessageComponentCollector({ time: 60000 });
        collector.on("collect", async (btn) => {
            if (btn.user.id !== (isPrefix ? message.author.id : interaction.user.id)) {
                return btn.reply({ content: "❌ Only the command author can use these buttons.", ephemeral: true });
            }

            if (btn.customId === "prev" && page > 0) page--;
            else if (btn.customId === "next" && (page + 1) * pageSize < list.length) page++;
            else if (btn.customId === "stop") return collector.stop();

            await btn.update({ embeds: [generateEmbed(page)], components: [row] });
        });

        collector.on("end", () => {
            msg.edit({ components: [] }).catch(() => {});
        });
    }
};
