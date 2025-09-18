const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require("discord.js");
const { searchEmojis, logEmoji } = require("../Handlers/emojiHandler");

const blueHeart = "<a:blue_heart:1414309560231002194>";

module.exports = {
    data: new SlashCommandBuilder()
        .setName("emoji")
        .setDescription("Search and add emojis from emoji.gg")
        .addSubcommand((sub) =>
            sub
                .setName("search")
                .setDescription("Search emojis from emoji.gg")
                .addStringOption((opt) =>
                    opt
                        .setName("name")
                        .setDescription("Emoji name")
                        .setRequired(true)
                )
        ),

    async execute({ interaction, message }) {
        // ✅ Safely resolve guild and user
        const guildId = interaction?.guildId || message?.guild?.id;
        const guild = interaction?.guild || message?.guild;
        const user = interaction?.user || message?.author;

        if (!guildId || !guild) {
            return interaction
                ? interaction.reply({
                      content: "❌ This command must be used inside a server.",
                      ephemeral: true,
                  })
                : message.reply("❌ This command must be used inside a server.");
        }

        // ✅ Get query from slash or prefix
        let query;
        if (interaction) {
            query = interaction.options.getString("name");
        } else {
            const args = message.content.trim().split(/\s+/).slice(1);
            if (args[0]?.toLowerCase() !== "search") {
                return message.reply("❌ Usage: `!emoji search <name>`");
            }
            query = args.slice(1).join(" ");
        }

        // 🔎 Search emojis
        const emojis = await searchEmojis(query);
        if (!emojis.length) {
            return interaction
                ? interaction.reply(`❌ No emojis found for **${query}**`)
                : message.reply(`❌ No emojis found for **${query}**`);
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
                    { name: "ID", value: emoji.id.toString(), inline: true }
                )
                .setFooter({ text: `Requested by ${user.tag}` })
                .setTimestamp();
        };

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("prev")
                .setLabel("☚")
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId("next")
                .setLabel("☛")
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId("add")
                .setLabel("➕ Add")
                .setStyle(ButtonStyle.Success)
        );

        // ✅ Send reply
        const sent = interaction
            ? await interaction.reply({
                  embeds: [getEmbed(page)],
                  components: [row],
                  ephemeral: false,
              })
            : await message.reply({
                  embeds: [getEmbed(page)],
                  components: [row],
              });

        // Support both interaction + prefix collectors
        const collector = (sent.fetch ? await sent.fetch() : sent).createMessageComponentCollector({
            time: 60000,
        });

        collector.on("collect", async (btn) => {
            if (btn.user.id !== user.id)
                return btn.reply({
                    content: "❌ Not your menu!",
                    ephemeral: true,
                });

            if (btn.customId === "prev") {
                page = page > 0 ? page - 1 : emojis.length - 1;
                await btn.update({ embeds: [getEmbed(page)], components: [row] });
            } else if (btn.customId === "next") {
                page = (page + 1) % emojis.length;
                await btn.update({ embeds: [getEmbed(page)], components: [row] });
            } else if (btn.customId === "add") {
                try {
                    const emoji = emojis[page];
                    const added = await guild.emojis.create({
                        attachment: emoji.image,
                        name: emoji.title.replace(/ /g, "_"),
                    });

                    await logEmoji(guildId, user.id, added.name, added.url);

                    return btn.reply({
                        content: `✅ Added emoji: ${added} (\`${added.name}\`)`,
                        ephemeral: true,
                    });
                } catch (err) {
                    console.error(err);
                    return btn.reply({
                        content: "❌ Failed to add emoji (permissions or limit).",
                        ephemeral: true,
                    });
                }
            }
        });
    },
};
