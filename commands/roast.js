const { 
    SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle 
} = require("discord.js");
const axios = require("axios");

module.exports = {
    name: "roast",
    description: "Randomly roast yourself or another user",
    data: new SlashCommandBuilder()
        .setName("roast")
        .setDescription("Randomly roast yourself or someone else")
        .addUserOption(opt => opt.setName("user").setDescription("User to roast").setRequired(false)),

    async execute(context) {
        const roaster = context.isPrefix ? context.message.author : context.interaction.user;
        const target = context.isPrefix
            ? context.args[0] ? context.message.mentions.users.first() : roaster
            : context.interaction.options.getUser("user") || roaster;

        // Fetch a roast from EvilInsult API
        async function fetchRoast() {
            try {
                const res = await axios.get("https://evilinsult.com/generate_insult.php?lang=en&type=json");
                return res.data.insult;
            } catch (err) {
                console.error("Error fetching roast:", err);
                return "Oops! Couldn't fetch a roast right now 😅";
            }
        }

        // Roast GIFs
        const gifs = [
            "https://media.giphy.com/media/3o6ZsX6W8XgjrU5vMQ/giphy.gif",
            "https://media.giphy.com/media/l0HlBo7eyXzSZkJri/giphy.gif",
            "https://media.giphy.com/media/xT0BKqhdlKCxCNsVTq/giphy.gif"
        ];
        const getRandomGif = () => gifs[Math.floor(Math.random() * gifs.length)];

        // Function to generate embed with roast and emoji
        async function createEmbed() {
            const roast = await fetchRoast();
            const gif = getRandomGif();

            return new EmbedBuilder()
                .setTitle("🔥 Random Roast 🔥")
                .setDescription(`<a:pikawink_1413480827458686997:1413480827458686997> ${target}, ${roast}`)
                .setColor("DarkRed")
                .setImage(gif)
                .setFooter({ text: `Roasted by ${roaster.tag}` })
                .setTimestamp();
        }

        // Buttons
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("another_roast")
                .setLabel("Another Roast")
                .setStyle(ButtonStyle.Primary)
        );

        const embed = await createEmbed();

        // Send initial embed
        let message;
        if (context.isPrefix) {
            message = await context.message.reply({ embeds: [embed], components: [row] });
        } else {
            message = await context.interaction.reply({ embeds: [embed], components: [row], fetchReply: true });
        }

        // Collector for button clicks
        const filter = i => i.customId === "another_roast" && i.user.id === roaster.id;
        const collector = message.createMessageComponentCollector({ filter, time: 60000 });

        collector.on("collect", async i => {
            const newEmbed = await createEmbed();
            await i.update({ embeds: [newEmbed], components: [row] });
        });

        collector.on("end", () => {
            const disabledRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId("another_roast")
                    .setLabel("Another Roast")
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(true)
            );
            message.edit({ components: [disabledRow] }).catch(() => {});
        });
    }
};
