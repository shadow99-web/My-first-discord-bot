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
        .setDescription("Search and add emojis from Discadia")
        .addSubcommand(sub =>
            sub.setName("search")
                .setDescription("Search emojis from Discadia")
                .addStringOption(opt =>
                    opt.setName("name")
                        .setDescription("Emoji name")
                        .setRequired(true)
                )
        ),

    async execute({ interaction, message }) {
        const guild = interaction?.guild || message.guild;
        const user = interaction?.user || message.author;
        let query;

        // ✅ Parse input
        if (interaction) {
            query = interaction.options.getString("name");
        } else {
            const args = message.content.trim().split(/\s+/).slice(1);
            if (args[0] !== "search") return message.reply("❌ Usage: !emoji search <name>");
            query = args.slice(1).join(" ");
        }

        // ✅ Fetch emojis
        const emojis = await searchEmojis(query);
        if (!emojis.length) {
            return interaction
                ? interaction.reply(`❌ No emojis found for **${query}**`)
                : message.reply(`❌ No emojis found for **${query}**`);
        }

        let page = 0;

        // ✅ Embed builder
        const getEmbed = (page) => {
            const emoji = emojis[page];
            return new EmbedBuilder()
                .setColor("Blue")
                .setTitle(`${blueHeart} Emoji Search`)
                .setDescription(`Result **${page + 1}/${emojis.length}**`)
                .setThumbnail(emoji.url)
                .addFields(
                    { name: "Name", value: emoji.name || "Unknown", inline: true },
                    { name: "Animated", value: emoji.animated ? "Yes" : "No", inline: true }
                )
                .setFooter({ text: `Requested by ${user.tag}` })
                .setTimestamp();
        };

        // ✅ Buttons
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("prev").setLabel("☚").setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId("next").setLabel("☛").setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId("add").setLabel("➕ Add").setStyle(ButtonStyle.Success)
        );

        // ✅ Send message
        const reply = interaction
            ? await interaction.reply({ embeds: [getEmbed(page)], components: [row], fetchReply: true })
            : await message.reply({ embeds: [getEmbed(page)], components: [row] });

        // ✅ Collector
        const collector = reply.createMessageComponentCollector({ time: 60000 });

        collector.on("collect", async (btn) => {
            if (btn.user.id !== user.id)
                return btn.reply({ content: "❌ Not your menu!", ephemeral: true });

            if (btn.customId === "prev") {
                page = (page > 0) ? page - 1 : emojis.length - 1;
                await btn.update({ embeds: [getEmbed(page)], components: [row] });
            } else if (btn.customId === "next") {
                page = (page + 1) % emojis.length;
                await btn.update({ embeds: [getEmbed(page)], components: [row] });
            } else if (btn.customId === "add") {
                try {
                    const emoji = emojis[page];
                    const added = await guild.emojis.create({
                        attachment: emoji.url,
                        name: emoji.name.replace(/ /g, "_")
                    });

                    await logEmoji(guild.id, user.id, added.name, added.url);

                    return btn.reply({
                        content: `✅ Added emoji: ${added} (\`${added.name}\`)`,
                        ephemeral: true
                    });
                } catch (err) {
                    console.error(err);
                    return btn.reply({
                        content: "❌ Failed to add emoji (permissions or server limit).",
                        ephemeral: true
                    });
                }
            }
        });

        collector.on("end", async () => {
            try {
                await reply.edit({ components: [] }); // disable buttons after timeout
            } catch {}
        });
    }
};
