const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

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
  ["Be invisible whenever you want", "Be able to fly whenever you want"],
  ["Read minds", "Predict the future"],
  ["Have a rewind button in life", "Have a pause button in life"],
  ["Live without music", "Live without movies"],
  ["Never use social media again", "Never watch TV again"],
  ["Always know when someone is lying", "Always get away with lying"],
  ["Eat only pizza for a year", "Eat only burgers for a year"],
  ["Be 10 minutes late every time", "Be 20 minutes early every time"],
  ["Have a flying carpet", "Have a car that can drive underwater"],
  ["Lose the ability to lie", "Lose the ability to speak the truth"],
  ["Have telepathy", "Have telekinesis"],
  ["Be able to teleport anywhere", "Be able to time travel"],
  ["Fight 100 duck-sized horses", "Fight 1 horse-sized duck"],
  ["Live on the beach forever", "Live in a forest forever"],
  ["Always sweat chocolate", "Always sweat cheese"],
  ["Have unlimited pizza", "Have unlimited ice cream"],
  ["Never feel pain", "Never feel fear"],
  ["Be a famous actor", "Be a famous musician"],
  ["Speak all languages", "Speak to animals"],
  ["Be extremely rich but unhappy", "Be poor but happy"],
  ["Never sleep again", "Never eat again"],
  ["Be able to breathe underwater", "Be able to survive in space"],
  ["Always have bad WiFi", "Always have bad battery"],
  ["Travel the world for free", "Live in luxury at home"],
  ["Always have to sing instead of talk", "Always have to dance instead of walk"],
  ["Know the date of your death", "Know the cause of your death"],
  ["Only be able to whisper", "Only be able to shout"],
  ["Be a superhero with no powers", "Be a villain with powers"],
  ["Eat only sweet food", "Eat only savory food"],
  ["Be constantly itchy", "Be constantly sticky"],
  ["Have free flights anywhere", "Have free hotels anywhere"],
  ["Live in a world without internet", "Live in a world without electricity"],
  ["Always have to tell the truth", "Always have to lie"],
  ["See 10 minutes into the future", "See 150 years into the future"],
  ["Have perfect memory", "Be able to forget anything you want"],
  ["Be able to talk to ghosts", "Be able to see the future"],
  ["Live without your phone", "Live without your friends"],
  ["Be a famous scientist", "Be a famous explorer"],
  ["Be able to stop time", "Be able to slow down time"],
  ["Have unlimited money but no friends", "Have lots of friends but poor"],
  ["Be invisible to everyone", "Be invincible to everyone"],
  ["Always be cold", "Always be hot"],
  ["Have free food for life", "Have free travel for life"],
  ["Be the smartest person alive", "Be the funniest person alive"],
  ["Only read books", "Only watch movies"],
  ["Have a photographic memory", "Have perfect musical talent"],
  ["Be able to control weather", "Be able to control animals"],
  ["Only be able to eat breakfast foods", "Only be able to eat dinner foods"],
  ["Live in space", "Live underwater"],
  ["Always forget people's names", "Always forget people's faces"],
  ["Have a personal robot", "Have a personal jetpack"],
  ["Never feel tired", "Never feel hungry"],
  ["Be able to speak every language fluently", "Be able to play every instrument perfectly"],
  ["Live without chocolate", "Live without coffee"],
  ["Only be able to use one app on your phone", "Never be able to use the same app twice"],
  ["Always have rain", "Always have sunshine"],
  ["Be famous on social media", "Be famous in real life"],
  ["Only wear one color forever", "Never wear the same outfit twice"],
  ["Eat bugs for a week", "Drink only water for a week"],
  ["Always lose at games", "Always win but nobody notices"],
  ["Be a wizard in Hogwarts", "Be a Jedi in Star Wars universe"],
  ["Have a clone of yourself", "Have a pet dragon"],
  ["Live 100 years in the past", "Live 100 years in the future"],
  ["Have unlimited energy", "Have unlimited knowledge"],
  ["Always have to run everywhere", "Always have to crawl everywhere"],
  ["Be able to shapeshift", "Be able to read minds"],
  ["Live on a deserted island", "Live in a crowded city forever"],
  ["Be extremely tall", "Be extremely short"],
  ["Only eat spicy food", "Only eat bland food"],
  ["Have super speed", "Have super strength"],
  ["Never be able to speak", "Never be able to hear"],
  ["Live without music", "Live without movies"],
  ["Have a teleportation device", "Have a time machine"],
  ["Be stuck in a romantic comedy", "Be stuck in a horror movie"],
  ["Always feel sleepy", "Always feel hungry"],
  ["Be invisible for a day", "Be able to fly for a day"],
  ["Be able to communicate with aliens", "Be able to communicate with animals"],
  ["Have a perfect partner", "Have perfect friends"],
  ["Be famous for one week", "Be rich for one week"],
  ["Always be in a crowd", "Always be alone"],
  ["Have unlimited video games", "Have unlimited books"],
  ["Be able to breathe fire", "Be able to freeze things"],
  ["Have a magical pet", "Have a magical house"],
  ["Live in a castle", "Live in a spaceship"],
  ["Be able to control dreams", "Be able to control reality"],
  ["Only be able to whisper", "Only be able to shout"],
  ["Have your own theme park", "Have your own private island"],
  ["Be able to fly with wings", "Be able to swim underwater"],
  ["Always know the weather", "Always know the stock market"],
  ["Have all the knowledge of the universe", "Have all the happiness of the universe"],
  ["Be able to never sleep", "Be able to never feel pain"],
  ["Always have your favorite food", "Always have your favorite drink"],
  ["Be able to pause time", "Be able to rewind time"],
  ["Live in a world with magic", "Live in a world with advanced technology"],
  ["Be able to speak to plants", "Be able to speak to animals"],
  ["Be extremely fast", "Be extremely strong"],
  ["Only wear pajamas forever", "Only wear a suit forever"],
  ["Be able to breathe underwater", "Be able to survive in space"],
  ["Have a personal chef", "Have a personal chauffeur"],
  ["Be a professional athlete", "Be a professional musician"],
  ["Be able to talk to computers", "Be able to talk to electronics"],
  ["Only eat sweets", "Only eat salty foods"],
  ["Be extremely lucky", "Be extremely smart"],
  ["Be invisible to everyone except friends", "Be invincible to everyone except enemies"],
  ["Only live in winter", "Only live in summer"],
  ["Be able to teleport anywhere anytime", "Be able to time travel anytime"],
  ["Have unlimited clothes", "Have unlimited shoes"],
  ["Always win at games", "Always lose at games but be happy"],
  ["Be able to stop aging", "Be able to reverse aging"],
  ["Live forever", "Die young but have an amazing life"],
  ["Always have perfect WiFi", "Always have perfect food"],
  ["Be able to control time", "Be able to control space"],
  ["Be extremely creative", "Be extremely logical"],
  ["Only be able to type", "Only be able to speak"],
  ["Be famous for your talents", "Be famous for your looks"],
  ["Have unlimited energy", "Have unlimited sleep"],
  ["Always feel happy", "Always feel excited"],
  ["Be able to eat anything without gaining weight", "Be able to sleep anywhere anytime"],
  ["Be extremely flexible", "Be extremely strong"],
  ["Only eat breakfast foods", "Only eat dinner foods"],
  ["Have super intelligence", "Have super empathy"],
  ["Only watch movies", "Only watch TV shows"],
  ["Always know the truth", "Always lie but make people happy"],
  ["Be able to teleport to any planet", "Be able to teleport to any country"],
  ["Have a robot best friend", "Have a magical animal best friend"],
  ["Be able to breathe in space", "Be able to breathe underwater"],
  ["Always have perfect fashion", "Always have perfect hygiene"],
  ["Be able to see the future", "Be able to change the past"],
  ["Have a private jet", "Have a private yacht"],
  ["Be able to speak all languages", "Be able to play all instruments"],
  ["Always get what you want", "Always help others get what they want"],
  ["Be able to shrink to tiny size", "Be able to grow to giant size"],
  ["Have all the money in the world", "Have all the friends in the world"],
  ["Be able to instantly learn skills", "Be able to instantly forget mistakes"],
  ["Live in a city of your choice", "Live in a village of your choice"],
  ["Have all the knowledge in the world", "Have all the happiness in the world"]
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
