const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    PermissionFlagsBits, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle 
} = require("discord.js");

// 🎯 Safe name cleaner for Discord emoji/sticker rules
function cleanName(input) {
    if (!input) return "emote_item";

    return input
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, "_") // invalid → underscore
        .replace(/_+/g, "_") // collapse multiple underscores
        .slice(0, 32) || "emote_item"; // prevent empty
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("steal")
        .setDescription("Steal an emoji or sticker by replying to a message")
        .addStringOption(opt =>
            opt.setName("server_id")
                .setDescription("Target server ID (optional)")
        ),

    name: "steal",
    aliases: ["stealemote", "stealemoji", "stealsticker"],

    async execute({ interaction, message, client, args }) {
        const isSlash = !!interaction;
        const serverId = isSlash 
            ? interaction.options.getString("server_id")
            : args[0];

        const targetGuild = serverId
            ? client.guilds.cache.get(serverId)
            : (interaction ? interaction.guild : message.guild);

        // ❌ Server not found
        if (!targetGuild) {
            const msg = "❌ I can’t find that server or I’m not in it.";
            return isSlash 
                ? interaction.reply({ content: msg, flags: 64 })
                : message.reply(msg);
        }

        // ❌ Missing permissions
        if (!targetGuild.members.me.permissions.has(PermissionFlagsBits.ManageEmojisAndStickers)) {
            const msg = "❌ I don’t have permission to manage emojis/stickers in that server.";
            return isSlash 
                ? interaction.reply({ content: msg, flags: 64 })
                : message.reply(msg);
        }

        // Must reply to a message
        let repliedMsg;
        if (isSlash) {
            const msgId = interaction.targetId;
            repliedMsg = msgId
                ? await interaction.channel.messages.fetch(msgId).catch(() => null)
                : null;
        } else if (message.reference) {
            repliedMsg = await message.channel.messages
                .fetch(message.reference.messageId)
                .catch(() => null);
        }

        if (!repliedMsg) {
            const msg = "❌ Please reply to a message containing an emoji or sticker!";
            return isSlash 
                ? interaction.reply({ content: msg, flags: 64 })
                : message.reply(msg);
        }

        let emojiURL, rawName;

        // 🎯 Extract custom emoji
        const emojiRegex = /<(a)?:([a-zA-Z0-9_]+):(\d+)>/;
        const match = emojiRegex.exec(repliedMsg.content);

        if (match) {
            const isAnimated = !!match[1];
            rawName = match[2];
            const id = match[3];
            emojiURL = `https://cdn.discordapp.com/emojis/${id}.${isAnimated ? "gif" : "png"}`;
        }

        // 🎯 Extract sticker
        if (!emojiURL && repliedMsg.stickers.size > 0) {
            const sticker = repliedMsg.stickers.first();
            emojiURL = sticker.url;
            rawName = sticker.name;
        }

        if (!emojiURL) {
            const msg = "❌ No emoji or sticker found in that message!";
            return isSlash
                ? interaction.reply({ content: msg, flags: 64 })
                : message.reply(msg);
        }

        const emojiName = cleanName(rawName);

        const autoType = emojiURL.endsWith(".webp") ? "sticker" : "emoji";

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

        const embed = new EmbedBuilder()
            .setColor("Blue")
            .setTitle(`🔍 Detected as ${autoType.toUpperCase()}`)
            .setDescription(`Cleaned name: \`${emojiName}\``)
            .setImage(emojiURL)
            .setTimestamp();

        const sentMsg = isSlash
            ? await interaction.reply({ embeds: [embed], components: [buttons], fetchReply: true })
            : await message.reply({ embeds: [embed], components: [buttons] });

        const collector = sentMsg.createMessageComponentCollector({ time: 30000 });

        collector.on("collect", async (btn) => {
            if (btn.user.id !== (isSlash ? interaction.user.id : message.author.id))
                return btn.reply({ content: "❌ Only the command user can use this!", flags: 64 });

            await btn.deferUpdate();

            try {
                if (btn.customId === "set_as_emoji") {
                    const created = await targetGuild.emojis.create({
                        attachment: emojiURL,
                        name: emojiName,
                    });

                    const success = new EmbedBuilder()
                        .setColor("Green")
                        .setTitle("✅ Emoji Added!")
                        .setDescription(`Added \`:${created.name}:\` to **${targetGuild.name}**`)
                        .setThumbnail(created.url);

                    return btn.editReply({ embeds: [success], components: [] });
                }

                // Sticker
                const sticker = await targetGuild.stickers.create({
                    file: emojiURL,
                    name: emojiName,
                    tags: "stolen",
                });

                const success = new EmbedBuilder()
                    .setColor("Green")
                    .setTitle("✅ Sticker Added!")
                    .setDescription(`Added **${sticker.name}** to **${targetGuild.name}**`)
                    .setThumbnail(emojiURL);

                return btn.editReply({ embeds: [success], components: [] });
            } catch (err) {
                console.error(err);
                return btn.editReply({
                    content: "⚠️ Failed to add emoji/sticker. Unsupported format or permissions.",
                    components: []
                });
            }
        });

        collector.on("end", () => {
            if (sentMsg.editable) {
                sentMsg.edit({ components: [] }).catch(() => {});
            }
        });
    }
};
