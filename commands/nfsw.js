const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const axios = require("axios");

const categories = {
    ass: [
        { name: "Nekobot", url: "https://nekobot.xyz/api/image?type=ass", path: "message" },
        { name: "WaifuPics", url: "https://api.waifu.pics/nsfw/ass", path: "url" },
        { name: "SomeRandomAPI", url: "https://some-random-api.com/ass", path: "url" },
    ],
    boobs: [
        { name: "Nekobot", url: "https://nekobot.xyz/api/image?type=boobs", path: "message" },
        { name: "WaifuPics", url: "https://api.waifu.pics/nsfw/boobs", path: "url" },
    ],
    hentai: [
        { name: "Nekobot", url: "https://nekobot.xyz/api/image?type=hentai", path: "message" },
        { name: "WaifuPics", url: "https://api.waifu.pics/nsfw/hentai", path: "url" },
    ],
    thighs: [
        { name: "WaifuPics", url: "https://api.waifu.pics/nsfw/thigh", path: "url" },
    ],
    anal: [
        { name: "Nekobot", url: "https://nekobot.xyz/api/image?type=anal", path: "message" }, 
        ], 
    pussy: [
        {name: "Nekobot", url: "https://nekobot.xyz/api/image?type=pussy", path: "message" }, 
        ], 
    blowjob: [
        {name: "Nekobot", url: "https://nekobot.xyz/api/image?type=blowjob", path: "message" }, 
        ], 
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName("nsfw")
        .setDescription("Get a NSFW image from various categories (NSFW channel required)")
        .addStringOption(option =>
            option.setName("type")
                .setDescription("Select NSFW category")
                .setRequired(true)
                .addChoices(
                    { name: "Ass", value: "ass" },
                    { name: "Boobs", value: "boobs" },
                    { name: "Hentai", value: "hentai" },
                    { name: "Thighs", value: "thighs" },
                    { name: "anal", value: "anal"}, 
                    { name: "pussy", value: "pussy" }, 
                    { name: "blowjob", value: "blowjob" }, 
                )
        ),

    async execute(context) {
        const isSlash = !context.isPrefix;
        const channel = isSlash ? context.interaction.channel : context.message.channel;
        const user = isSlash ? context.interaction.user : context.message.author;

        // NSFW channel check
        if (!channel.nsfw) {
            const embed = new EmbedBuilder()
                .setTitle('❌ Not NSFW channel')
                .setDescription('> *This command can only be used in NSFW channels.*')
                .setFooter({ text: user.username, iconURL: user.displayAvatarURL({ dynamic: true }) })
                .setColor('Red')
                .setTimestamp();

            if (isSlash) return context.interaction.reply({ embeds: [embed], ephemeral: true });
            return context.message.reply({ embeds: [embed] });
        }

        // Get category
        const type = isSlash ? context.interaction.options.getString("type") : context.args[0]?.toLowerCase();
        if (!type || !categories[type]) {
            const embed = new EmbedBuilder()
                .setTitle('❌ Invalid category')
                .setDescription('> Available categories: ass, boobs, hentai, thighs, anal, pussy, blowjob')
                .setFooter({ text: user.username, iconURL: user.displayAvatarURL({ dynamic: true }) })
                .setColor('Red')
                .setTimestamp();

            if (isSlash) return context.interaction.reply({ embeds: [embed], ephemeral: true });
            return context.message.reply({ embeds: [embed] });
        }

        // Defer reply for slash commands (prevents Unknown Interaction)
        if (isSlash) await context.interaction.deferReply();

        // Fetch image from random API
        let imageUrl = null;
        const shuffled = categories[type].sort(() => Math.random() - 0.5);

        for (const api of shuffled) {
            try {
                const res = await axios.get(api.url);
                imageUrl = res.data[api.path];
                if (imageUrl) break;
            } catch {}
        }

        if (!imageUrl) {
            const embed = new EmbedBuilder()
                .setTitle('❌ Error occurred')
                .setDescription('> All NSFW image APIs failed. Try again later.')
                .setFooter({ text: user.username, iconURL: user.displayAvatarURL({ dynamic: true }) })
                .setColor('Red')
                .setTimestamp();

            if (isSlash) return context.interaction.editReply({ embeds: [embed], ephemeral: true });
            return context.message.reply({ embeds: [embed] });
        }

        // Embed with image + link button
        const embed = new EmbedBuilder()
            .setTitle(`🔞 NSFW ${type.charAt(0).toUpperCase() + type.slice(1)} Image`)
            .setImage(imageUrl)
            .setFooter({ text: channel.guild ? channel.guild.name : "DM", iconURL: channel.guild?.iconURL({ dynamic: true }) })
            .setColor(Math.floor(Math.random() * 16777215).toString(16))
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setEmoji('📎')
                .setLabel('Link')
                .setStyle(ButtonStyle.Link)
                .setURL(imageUrl)
        );

        if (isSlash) await context.interaction.editReply({ embeds: [embed], components: [row] });
        else await context.message.reply({ embeds: [embed], components: [row] });
    }
};
