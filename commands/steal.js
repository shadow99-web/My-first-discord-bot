const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");

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
        const targetGuild = serverId ? client.guilds.cache.get(serverId) : (interaction ? interaction.guild : message.guild);

        // ⚠️ Check permissions
        if (!targetGuild) {
            const errMsg = "❌ I can’t find that server or I’m not in it.";
            return isSlash ? interaction.reply({ content: errMsg, ephemeral: true }) : message.reply(errMsg);
        }
        if (!targetGuild.members.me.permissions.has(PermissionFlagsBits.ManageEmojisAndStickers)) {
            const errMsg = "❌ I don’t have permission to manage emojis/stickers in that server.";
            return isSlash ? interaction.reply({ content: errMsg, ephemeral: true }) : message.reply(errMsg);
        }

        // ✅ Must reply to a message
        const repliedMsg = interaction ? await interaction.channel.messages.fetch(interaction.targetId || interaction.options.getMessage?.("message")) : message.reference ? await message.channel.messages.fetch(message.reference.messageId) : null;

        if (!repliedMsg) {
            const errMsg = "❌ Please reply to a message containing an emoji or sticker!";
            return isSlash ? interaction.reply({ content: errMsg, ephemeral: true }) : message.reply(errMsg);
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
            return isSlash ? interaction.reply({ content: errMsg, ephemeral: true }) : message.reply(errMsg);
        }

        try {
            const createdEmoji = await targetGuild.emojis.create({
                attachment: emojiURL,
                name: emojiName,
            });

            const embed = new EmbedBuilder()
                .setColor("Blue")
                .setTitle("✅ Emoji/Sticker Stolen!")
                .setDescription(`Added to **${targetGuild.name}** as \`:${createdEmoji.name}:\``)
                .setThumbnail(createdEmoji.url)
                .setFooter({ text: `Requested by ${isSlash ? interaction.user.tag : message.author.tag}` })
                .setTimestamp();

            return isSlash
                ? interaction.reply({ embeds: [embed] })
                : message.reply({ embeds: [embed] });

        } catch (err) {
            console.error("❌ Failed to steal emoji/sticker:", err);
            const errMsg = "⚠️ Failed to add emoji/sticker. Maybe server is full?";
            return isSlash ? interaction.reply({ content: errMsg, ephemeral: true }) : message.reply(errMsg);
        }
    },
};
