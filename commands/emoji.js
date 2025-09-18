const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");
const { searchEmojis, logEmoji } = require("../Handlers/emojiHandler");

const blueHeart = "<a:blue_heart:1414309560231002194>";

module.exports = {
    data: new SlashCommandBuilder()
        .setName("emoji")
        .setDescription("Search and add emojis from emoji.gg")
        .addSubcommand(sub =>
            sub.setName("search")
                .setDescription("Search emojis from emoji.gg")
                .addStringOption(opt =>
                    opt.setName("name")
                        .setDescription("Emoji name")
                        .setRequired(true)
                )
        ),

    async execute({ interaction, message }) {
        const guildId = interaction?.guildId || message?.guild?.id;
        const user = interaction?.user || message?.author;

        // ✅ Safe reply helper
        const reply = async (content) => {
            const payload = typeof content === "string" ? { content } : content;

            if (interaction) {
                if (interaction.deferred || interaction.replied) {
                    try {
                        return await interaction.editReply(payload);
                    } catch {
                        return interaction.followUp(payload).catch(() => {});
                    }
                } else {
                    return interaction.reply({ ...payload, ephemeral: false }).catch(() => {});
                }
            } else if (message) {
                return message.reply(payload).catch(() => {});
            }
        };

        let query;
        if (interaction) {
            query = interaction.options.getString("name");
        } else if (message) {
            const args = message.content.trim().split(/\s+/).slice(1);
            if (args[0] !== "search") return reply("❌ Usage: !emoji search <name>");
            query = args.slice(1).join(" ");
        }

        const emojis = await searchEmojis(query);
        if (!emojis?.length) {
            return reply(`❌ No emojis found for **${query}**`);
        }

        let page = 0;

        const getEmbed = (page) => {
            const emoji = emojis[page];
            return new EmbedBuilder()
                .setColor("Blue")
                .setTitle(`${blueHeart} Emoji Search`)
                .setDescription(`Result **${page + 1}/${emojis.length}**`)
                .setThumbnail(emoji.image)
                .addFields(
                    { name: "Name", value: emoji.title || "Unknown", inline: true },
                    { name: "ID", value: emoji.id?.toString() || "N/A", inline: true }
                )
                .setFooter({ text: `Requested by ${user?.tag}` })
                .setTimestamp();
        };

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("prev").setLabel("☚").setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId("next").setLabel("☛").setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId("add").setLabel("➕ Add").setStyle(ButtonStyle.Success)
        );

        const sent = await reply({ embeds: [getEmbed(page)], components: [row] });

        const collector = sent.createMessageComponentCollector({ time: 60000 });

        collector.on("collect", async (btn) => {
            if (btn.user.id !== user.id) {
                return btn.reply({ content: "❌ Not your menu!", ephemeral: true });
            }

            if (btn.customId === "prev") {
                page = (page > 0) ? page - 1 : emojis.length - 1;
                await btn.update({ embeds: [getEmbed(page)], components: [row] });
            } else if (btn.customId === "next") {
                page = (page + 1) % emojis.length;
                await btn.update({ embeds: [getEmbed(page)], components: [row] });
            } else if (btn.customId === "add") {
                try {
                    const emoji = emojis[page];
                    const added = await btn.guild.emojis.create({
                        attachment: emoji.image,
                        name: emoji.title.replace(/ /g, "_")
                    });

                    await logEmoji(guildId, user.id, added.name, added.url);

                    return btn.reply({ content: `✅ Added emoji: ${added} (\`${added.name}\`)`, ephemeral: true });
                } catch (err) {
                    console.error(err);
                    return btn.reply({ content: "❌ Failed to add emoji (permissions or limit).", ephemeral: true });
                }
            }
        });
    }
};
