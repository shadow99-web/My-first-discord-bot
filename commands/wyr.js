const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const fetch = require("node-fetch");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("wyr")
        .setDescription("Play 'Would You Rather' 🎭")
        .addIntegerOption(opt =>
            opt.setName("rounds")
                .setDescription("Number of rounds (default 3)")
                .setMinValue(1)
                .setMaxValue(10)
        )
        .addIntegerOption(opt =>
            opt.setName("duration")
                .setDescription("Seconds per round (default 30)")
                .setMinValue(10)
                .setMaxValue(120)
        ),

    async execute(context) {
        const interaction = context.interaction;
        const message = context.message;
        const user = context.isPrefix ? message.author : interaction.user;

        const rounds = interaction?.options.getInteger("rounds") || 3;
        const duration = interaction?.options.getInteger("duration") || 30;

        // Local question bank
        const localQuestions = [
            ["Be invisible", "Read minds"],
            ["Live without music", "Live without movies"],
            ["Always be 10 minutes late", "Always be 20 minutes early"],
            ["Only eat pizza for a year", "Only eat burgers for a year"],
            ["Have a flying carpet", "Have a car that can drive underwater"],
            ["Never use social media again", "Never watch TV again"],
            ["Lose the ability to lie", "Lose the ability to speak the truth"],
            ["Be able to teleport anywhere", "Be able to time travel"],
            ["Always know when someone is lying", "Always get away with lying"],
            ["Fight 100 duck-sized horses", "Fight 1 horse-sized duck"]
        ];

        let currentRound = 1;

        const startRound = async () => {
            // Fetch question from API
            let question;
            try {
                const res = await fetch("https://would-you-rather-api.abaanshanid.repl.co/");
                const data = await res.json();
                question = data.data;
            } catch (err) {
                console.error("API Error:", err);
                // Fallback to local question bank
                question = localQuestions[Math.floor(Math.random() * localQuestions.length)];
            }

            const votes = { a: [], b: [] };

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId("wyr_a").setLabel("Option A").setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId("wyr_b").setLabel("Option B").setStyle(ButtonStyle.Danger)
            );

            const embed = new EmbedBuilder()
                .setTitle(`🎭 Would You Rather - Round ${currentRound}/${rounds}`)
                .setDescription(`**A:** ${question[0]}\n**B:** ${question[1]}`)
                .addFields(
                    { name: "Votes A", value: "0", inline: true },
                    { name: "Votes B", value: "0", inline: true }
                )
                .setColor("Random")
                .setFooter({ text: `Voting ends in ${duration}s | Requested by ${user.tag}` })
                .setTimestamp();

            let replyMsg;
            if (context.isPrefix) {
                replyMsg = await message.reply({ embeds: [embed], components: [row] });
            } else {
                replyMsg = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });
            }

            const collector = replyMsg.createMessageComponentCollector({ time: duration * 1000 });

            collector.on("collect", async i => {
                if (i.customId === "wyr_a" && !votes.a.includes(i.user.id) && !votes.b.includes(i.user.id)) votes.a.push(i.user.id);
                if (i.customId === "wyr_b" && !votes.b.includes(i.user.id) && !votes.a.includes(i.user.id)) votes.b.push(i.user.id);

                const updatedEmbed = EmbedBuilder.from(embed)
                    .spliceFields(0, 2,
                        { name: "Votes A", value: `${votes.a.length}`, inline: true },
                        { name: "Votes B", value: `${votes.b.length}`, inline: true }
                    );

                await replyMsg.edit({ embeds: [updatedEmbed], components: [row] });
                await i.deferUpdate();
            });

            collector.on("end", async () => {
                const finalEmbed = EmbedBuilder.from(embed)
                    .setTitle(`📊 Round ${currentRound} Results`)
                    .spliceFields(0, 2,
                        { name: "Votes A", value: `${votes.a.length}`, inline: true },
                        { name: "Votes B", value: `${votes.b.length}`, inline: true }
                    )
                    .setColor("Green");

                await replyMsg.edit({ embeds: [finalEmbed], components: [] });

                currentRound++;
                if (currentRound <= rounds) {
                    setTimeout(startRound, 2000);
                } else {
                    const endEmbed = new EmbedBuilder()
                        .setTitle("🤞🏻 Game Over")
                        .setDescription(`All **${rounds} rounds** are finished!\nThanks for playing ♥!`)
                        .setColor("Gold")
                        .setFooter({ text: `Game hosted by ${user.tag}` })
                        .setTimestamp();
                    await message.channel.send({ embeds: [endEmbed] }).catch(() => {});
                }
            });
        };

        startRound();
    }
};
