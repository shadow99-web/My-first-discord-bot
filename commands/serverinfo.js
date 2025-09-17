const { SlashCommandBuilder, EmbedBuilder, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("serverinfo")
        .setDescription("Get detailed information about this server"),

    name: "serverinfo",
    description: "Get detailed information about this server",

    async execute({ interaction, message }) {
        const guild = interaction?.guild || message.guild;
        const user = interaction?.user || message.author;
        const owner = await guild.fetchOwner();

        const createdTimestamp = `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`;
        const iconURL = guild.iconURL({ dynamic: true, size: 1024 });
        const bannerURL = guild.bannerURL({ size: 2048 });

        // Collect data
        const roleList = guild.roles.cache
            .filter(r => r.id !== guild.id)
            .map(r => r.toString());

        const textChannels = guild.channels.cache
            .filter(c => c.type === ChannelType.GuildText)
            .map(c => `#${c.name}`);

        const voiceChannels = guild.channels.cache
            .filter(c => c.type === ChannelType.GuildVoice)
            .map(c => `🔊 ${c.name}`);

        const emojis = guild.emojis.cache.map(e => e.toString());
        const stickers = guild.stickers.cache.map(s => s.name);

        // Split arrays into pages (20 per page)
        const paginate = (arr, size = 20) => {
            const chunks = [];
            for (let i = 0; i < arr.length; i += size) {
                chunks.push(arr.slice(i, i + size));
            }
            return chunks;
        };

        const rolePages = paginate(roleList);
        const channelPages = paginate([...textChannels, ...voiceChannels], 15);
        const emojiPages = paginate(emojis, 20);
        const stickerPages = paginate(stickers, 20);

        // Embed builder
        const buildEmbed = (page = 0) => {
            return new EmbedBuilder()
                .setColor("Blue")
                .setAuthor({ name: `${guild.name} - Server Info`, iconURL: iconURL })
                .setThumbnail(iconURL)
                .setDescription(`<a:blue_heart:1414309560231002194> **Server Overview**`)
                .addFields(
                    { name: " Server ID", value: guild.id, inline: true },
                    { name: " Owner", value: `${owner.user.tag}`, inline: true },
                    { name: " Created", value: createdTimestamp, inline: true },
                    { name: " Members", value: `${guild.memberCount}`, inline: true },
                    { name: " Verification Level", value: `${guild.verificationLevel}`, inline: true },
                    { name: " Roles", value: rolePages[page]?.join(", ") || "None" },
                    { name: " Channels", value: channelPages[page]?.join(", ") || "None" },
                    { name: " Emojis", value: emojiPages[page]?.join(" ") || "None" },
                    { name: " Stickers", value: stickerPages[page]?.join(", ") || "None" }
                )
                .setFooter({ text: `Requested by ${user.tag} • Page ${page + 1}/${Math.max(rolePages.length, channelPages.length, emojiPages.length, stickerPages.length)}` })
                .setTimestamp()
                .setImage(bannerURL || null);
        };

        // Buttons
        const getButtons = (page, totalPages) => {
            return new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId("prev")
                    .setLabel("☚ Previous")
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(page === 0),
                new ButtonBuilder()
                    .setCustomId("next")
                    .setLabel("☛ Next")
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(page === totalPages - 1)
            );
        };

        let page = 0;
        const totalPages = Math.max(rolePages.length, channelPages.length, emojiPages.length, stickerPages.length);

        const embed = buildEmbed(page);
        const buttons = getButtons(page, totalPages);

        let replyMsg;
        if (interaction) {
            replyMsg = await interaction.reply({ embeds: [embed], components: [buttons], fetchReply: true });
        } else {
            replyMsg = await message.reply({ embeds: [embed], components: [buttons] });
        }

        // Collector for button interactions
        const collector = replyMsg.createMessageComponentCollector({
            filter: (i) => i.user.id === user.id,
            time: 60 * 1000 // 1 minute
        });

        collector.on("collect", async (i) => {
            if (i.customId === "prev" && page > 0) page--;
            if (i.customId === "next" && page < totalPages - 1) page++;

            await i.update({
                embeds: [buildEmbed(page)],
                components: [getButtons(page, totalPages)]
            });
        });

        collector.on("end", async () => {
            if (replyMsg.editable) {
                replyMsg.edit({ components: [] }).catch(() => {});
            }
        });
    }
};
