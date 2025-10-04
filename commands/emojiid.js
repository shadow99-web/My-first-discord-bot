const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("emojiid")
        .setDescription("Fetch emoji ID from emoji or name")
        .addStringOption(opt =>
            opt.setName("emoji")
                .setDescription("Enter emoji (e.g. 😎 or :custom:) ")
                .setRequired(true)
        ),

    name: "emojiid",
    aliases: ["emoteid", "getemoji"],

    async execute(context) {
        const interaction = context.interaction;
        const message = context.message;
        const input = context.isPrefix
            ? context.args[0]
            : interaction.options.getString("emoji");

        // Regex for custom emojis <:name:id> or <a:name:id>
        const customEmojiRegex = /<a?:\w+:(\d+)>/;

        let emojiData = null;

        // ✅ Case 1: User passed a custom emoji directly
        const match = input.match(customEmojiRegex);
        if (match) {
            const id = match[1];
            const animated = input.startsWith("<a:");
            const name = input.split(":")[1];
            emojiData = { id, name, animated };
        }

        // ✅ Case 2: User typed emoji name (:emoji:)
        else if (input.startsWith(":") && input.endsWith(":")) {
            const name = input.replace(/:/g, "");
            const found = message.guild?.emojis.cache.find(e => e.name.toLowerCase() === name.toLowerCase());
            if (found) {
                emojiData = { id: found.id, name: found.name, animated: found.animated };
            }
        }

        // ✅ Case 3: Standard Unicode emoji (😎❤️ etc.)
        else {
            return context.isPrefix
                ? message.reply("❌ That looks like a standard emoji (no ID). Only custom emojis have IDs.")
                : interaction.reply("❌ That looks like a standard emoji (no ID). Only custom emojis have IDs.");
        }

        if (!emojiData) {
            return context.isPrefix
                ? message.reply("❌ Could not find that emoji!")
                : interaction.reply("❌ Could not find that emoji!");
        }

        // ✅ Build copyable format
        const emojiFormat = emojiData.animated
            ? `<a:${emojiData.name}:${emojiData.id}>`
            : `<:${emojiData.name}:${emojiData.id}>`;

        const embed = new EmbedBuilder()
            .setTitle("🔍 Emoji Information")
            .setColor("Random")
            .addFields(
                { name: "Name", value: emojiData.name, inline: true },
                { name: "ID", value: emojiData.id, inline: true },
                { name: "Copyable", value: `\`${emojiFormat}\``, inline: false }
            )
            .setThumbnail(`https://cdn.discordapp.com/emojis/${emojiData.id}.${emojiData.animated ? "gif" : "png"}?v=1`);

        return context.isPrefix
            ? message.reply({ embeds: [embed] })
            : interaction.reply({ embeds: [embed] });
    }
};
