const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const fetch = require("node-fetch");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("wyr")
        .setDescription("Play multi-round 'Would You Rather' 🎭")
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

    name: "wyr",
    aliases: ["wouldyourather"],

    async execute(context) {
        const interaction = context.interaction;
        const message = context.message;
        const user = context.isPrefix ? message.author : interaction.user;

        // ✅ Options
        const rounds = interaction
            ? interaction.options.getInteger("rounds") || 3
            : 3;
        const duration = interaction
            ? interaction.options.getInteger("duration") || 30
            : 30;

        let currentRound = 1;

        const startRound = async () => {
            // ✅ Fetch question
            let question;
            try {
                const res = await fetch("https://would-you-rather-api.abaanshanid.repl.co/");
                const data = await res.json();
                question = data.data;
            } catch (err) {
                console.error("WYR API Error:", err);
                return context.isPrefix
                    ? message.reply("❌ Failed to fetch a question, try again later!")
                    : interaction.reply("❌ Failed to fetch a question, try again later!");
            }

            // ✅ Votes storage
            const votes = { a: [], b: [] };

            // ✅ Buttons
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId("wyr_a").setLabel("Option A").setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId("wyr_b").setLabel("Option B").setStyle(ButtonStyle.Danger)
            );

            // ✅ Embed
            const embed = new EmbedBuilder()
                .setTitle(`🎭 Would You Rather - Round ${currentRound}/${rounds}`)
                .setDescription(`**A:** ${question[0]}\n**B:** ${question[1]}`)
                .addFields(
                    { name: " Votes A", value: "0", inline: true },
                    { name: " Votes B", value: "0", inline: true }
                )
                .setColor("Random")
                .setFooter({ text: `Voting ends in ${duration}s | Requested by ${user.tag}` })
                .setTimestamp();

            // ✅ Send initial message
            let replyMsg;
            if (context.isPrefix) {
                replyMsg = await message.reply({ embeds: [embed], components: [row] });
            } else {
                replyMsg = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });
            }

            // ✅ Collector
            const collector = replyMsg.createMessageComponentCollector({ time: duration * 1000 });

            collector.on("collect", async i => {
                if (i.customId === "wyr_a") {
                    if (!votes.a.includes(i.user.id) && !votes.b.includes(i.user.id)) votes.a.push(i.user.id);
                } else if (i.customId === "wyr_b") {
                    if (!votes.b.includes(i.user.id) && !votes.a.includes(i.user.id)) votes.b.push(i.user.id);
                }

                // Update embed live
                const updatedEmbed = EmbedBuilder.from(embed)
                    .spliceFields(0, 2,
                        { name: " Votes A", value: `${votes.a.length}`, inline: true },
                        { name: " Votes B", value: `${votes.b.length}`, inline: true }
                    );

                await replyMsg.edit({ embeds: [updatedEmbed], components: [row] });
                await i.deferUpdate();
            });

            collector.on("end", async () => {
                const finalEmbed = EmbedBuilder.from(embed)
                    .setTitle(`📊 Round ${currentRound} Results`)
                    .spliceFields(0, 2,
                        { name: " Votes A", value: `${votes.a.length}`, inline: true },
                        { name: " Votes B", value: `${votes.b.length}`, inline: true }
                    )
                    .setColor("Green");

                await replyMsg.edit({ embeds: [finalEmbed], components: [] });

                // Start next round if available
                currentRound++;
                if (currentRound <= rounds) {
                    setTimeout(startRound, 2000); // short pause before next round
                } else {
                    // Game finished
                    const endEmbed = new EmbedBuilder()
                        .setTitle("🏁 Would You Rather - Game Over")
                        .setDescription(`All **${rounds} rounds** are finished!\nThanks for playing ♥`)
                        .setColor("Gold")
                        .setFooter({ text: `Game hosted by ${user.tag}` })
                        .setTimestamp();
                    await message.channel.send({ embeds: [endEmbed] }).catch(() => {});
                }
            });
        };

        // Start first round
        startRound();
    }
};
