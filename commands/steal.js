const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    PermissionFlagsBits, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle 
} = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("steal")
        .setDescription("Steal an emoji or sticker by replying to a message")
        .addStringOption(opt =>
            opt.setName("server_id")
                .setDescription("Target server ID (optional)")
        ),

    name: "steal", // prefix support
    aliases: ["stealemote", "stealemoji", "stealsticker"],

    async execute({ interaction, message, client, args }) {
        const isSlash = !!interaction;
        const reply = isSlash ? interaction.options.get("server_id") : args[0];
        const serverId = reply || (isSlash ? null : args[0]);
        const targetGuild = serverId 
            ? client.guilds.cache.get(serverId) 
            : (interaction ? interaction.guild : message.guild);

        // ⚠️ Permission checks
        if (!targetGuild) {
            const errMsg = "❌ I can’t find that server or I’m not in it.";
            return isSlash 
                ? interaction.reply({ content: errMsg, ephemeral: true }) 
                : message.reply(errMsg);
        }

        if (!targetGuild.members.me.permissions.has(PermissionFlagsBits.ManageEmojisAndStickers)) {
            const errMsg = "❌ I don’t have permission to manage emojis/stickers in that server.";
            return isSlash 
                ? interaction.reply({ content: errMsg, ephemeral: true }) 
                : message.reply(errMsg);
        }

        // ✅ Must reply to a message
        const repliedMsg = interaction
            ? await interaction.channel.messages.fetch(interaction.targetId || interaction.options.getMessage?.("message"))
            : message.reference
                ? await message.channel.messages.fetch(message.reference.messageId)
                : null;

        if (!repliedMsg) {
            const errMsg = "❌ Please reply to a message containing an emoji or sticker!";
            return isSlash 
                ? interaction.reply({ content: errMsg, ephemeral: true }) 
                : message.reply(errMsg);
        }

        let emojiURL, emojiName;

        // ✅ Extract emoji from replied message
        const emojiRegex = /<(a)?:\w+:(\d+)>/;
        const emojiMatch = emojiRegex.exec(repliedMsg.content);

        if (emojiMatch) {
            const isAnimated = !!emojiMatch[1];
            const id = emojiMatch[2];
            emojiURL = `https://cdn.discordapp.com/emojis/${id}.${isAnimated ? "gif" : "png"}?v=1`;
            emojiName = "stolen_emoji";
        }

        // ✅ Extract sticker if exists
        if (!emojiURL && repliedMsg.stickers.size > 0) {
            const sticker = repliedMsg.stickers.first();
            emojiURL = sticker.url;
            emojiName = sticker.name || "stolen_sticker";
        }

        if (!emojiURL) {
            const errMsg = "❌ No emoji or sticker found in that message!";
            return isSlash 
                ? interaction.reply({ content: errMsg, ephemeral: true }) 
                : message.reply(errMsg);
        }

        // ✅ Detect type automatically
        const isStickerFile = /\.(webp|png)$/i.test(emojiURL);
        const autoType = isStickerFile ? "sticker" : "emoji";

        // ✅ Add buttons
        const buttons = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("set_as_emoji")
                .setLabel("🪄 Set as Emoji")
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId("set_as_sticker")
                .setLabel("🎟️ Set as Sticker")
                .setStyle(ButtonStyle.Secondary)
        );

        const previewEmbed = new EmbedBuilder()
            .setColor("Blue")
            .setTitle(`🔍 Detected as ${autoType.toUpperCase()}`)
            .setDescription("Choose what to do with this file:")
            .setImage(emojiURL)
            .setFooter({ text: `Requested by ${isSlash ? interaction.user.tag : message.author.tag}` })
            .setTimestamp();

        const sentMsg = isSlash
            ? await interaction.reply({ embeds: [previewEmbed], components: [buttons], fetchReply: true })
            : await message.reply({ embeds: [previewEmbed], components: [buttons] });

        // ✅ Button collector
        const collector = sentMsg.createMessageComponentCollector({ time: 30000 });

        collector.on("collect", async (btnInt) => {
            if (btnInt.user.id !== (isSlash ? interaction.user.id : message.author.id))
                return btnInt.reply({ content: "❌ Only the command user can use these buttons!", ephemeral: true });

            await btnInt.deferUpdate();

            try {
                if (btnInt.customId === "set_as_emoji" || (btnInt.customId !== "set_as_sticker" && autoType === "emoji")) {
                    const createdEmoji = await targetGuild.emojis.create({
                        attachment: emojiURL,
                        name: emojiName,
                    });

                    const success = new EmbedBuilder()
                        .setColor("Green")
                        .setTitle("✅ Emoji Added!")
                        .setDescription(`Added to **${targetGuild.name}** as \`:${createdEmoji.name}:\``)
                        .setThumbnail(createdEmoji.url)
                        .setTimestamp();

                    await btnInt.editReply({ embeds: [success], components: [] });
                } 
                else {
                    const sticker = await targetGuild.stickers.create({
                        file: emojiURL,
                        name: emojiName,
                        tags: "stolen",
                    });

                    const success = new EmbedBuilder()
                        .setColor("Green")
                        .setTitle("✅ Sticker Added!")
                        .setDescription(`Added to **${targetGuild.name}** as **${sticker.name}**`)
                        .setThumbnail(emojiURL)
                        .setTimestamp();

                    await btnInt.editReply({ embeds: [success], components: [] });
                }
            } catch (err) {
                console.error("❌ Failed to add:", err);
                await btnInt.editReply({ content: "⚠️ Failed to add emoji/sticker. Maybe unsupported format or missing permissions?", components: [] });
            }
        });

        collector.on("end", async () => {
            if (sentMsg.editable) {
                sentMsg.edit({ components: [] }).catch(() => {});
            }
        });
    },
};
