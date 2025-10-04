const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");


module.exports = {
    data: new SlashCommandBuilder()
        .setName("animegallery")
        .setDescription("Browse anime character images by name (gallery mode)")
        .addStringOption(opt =>
            opt.setName("name")
                .setDescription("Enter anime character name")
                .setRequired(true)
        ),

    name: "animegallery",
    aliases: ["agallery", "acharimg", "anicharimg"],

    async execute(context) {
        const interaction = context.interaction;
        const message = context.message;

        // ✅ Get input
        const query = context.isPrefix
            ? context.args.join(" ")
            : interaction.options.getString("name");

        if (!query) {
            return context.isPrefix
                ? message.reply("❌ Please provide a character name!")
                : interaction.reply("❌ Please provide a character name!");
        }

        try {
            // ✅ Fetch up to 10 characters
            const res = await fetch(`https://api.jikan.moe/v4/characters?q=${encodeURIComponent(query)}&limit=10`);
            const data = await res.json();

            if (!data.data || data.data.length === 0) {
                return context.isPrefix
                    ? message.reply(`❌ No character found with name **${query}**`)
                    : interaction.reply(`❌ No character found with name **${query}**`);
            }

            let page = 0;

            // ✅ Build image-only embed
            const buildEmbed = (char, pageIndex) => {
                return new EmbedBuilder()
                    .setTitle(`✨ ${char.name}`)
                    .setURL(char.url)
                    .setImage(char.images.jpg.image_url)
                    .setColor("Purple")
                    .setFooter({ text: `Result ${pageIndex + 1} of ${data.data.length} | Data from Jikan API` });
            };

            // ✅ Buttons
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId("prev").setLabel("⬅️ Previous").setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId("next").setLabel("➡️ Next").setStyle(ButtonStyle.Primary)
            );

            // ✅ Send first result
            let msg;
            if (context.isPrefix) {
                msg = await message.reply({ embeds: [buildEmbed(data.data[page], page)], components: [row] });
            } else {
                msg = await interaction.reply({ embeds: [buildEmbed(data.data[page], page)], components: [row], fetchReply: true });
            }

            // ✅ Collector for button interaction
            const filter = (i) => i.user.id === (context.isPrefix ? message.author.id : interaction.user.id);
            const collector = msg.createMessageComponentCollector({ filter, time: 60000 });

            collector.on("collect", async (i) => {
                if (i.customId === "prev") {
                    page = (page - 1 + data.data.length) % data.data.length;
                } else if (i.customId === "next") {
                    page = (page + 1) % data.data.length;
                }

                await i.update({ embeds: [buildEmbed(data.data[page], page)], components: [row] });
            });

            collector.on("end", async () => {
                try {
                    await msg.edit({ components: [] });
                } catch (e) {}
            });

        } catch (err) {
            console.error("AnimeGallery Error:", err);
            return context.isPrefix
                ? message.reply("⚠️ Error fetching gallery. Try again later.")
                : interaction.reply("⚠️ Error fetching gallery. Try again later.");
        }
    }
};
