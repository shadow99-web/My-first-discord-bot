// Commands/automod.js
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { setRule, removeRule, listRules, load } = require("../Handlers/automodHandler");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("automod")
        .setDescription("Manage AutoMod rules")
        .addSubcommand(sub =>
            sub.setName("add")
                .setDescription("Add an AutoMod rule")
                .addStringOption(opt =>
                    opt.setName("type")
                        .setDescription("Rule type (word/mention/link)")
                        .setRequired(true)
                )
                .addStringOption(opt =>
                    opt.setName("value")
                        .setDescription("Word, link or mention count")
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName("remove")
                .setDescription("Remove an AutoMod rule")
                .addIntegerOption(opt =>
                    opt.setName("index")
                        .setDescription("Index of the rule (see list)")
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName("list")
                .setDescription("List all AutoMod rules")
        ),

    async execute({ interaction, message }) {
        const guildId = interaction?.guildId || message.guild.id;
        const user = interaction?.user || message.author;

        // ✅ Safe reply wrapper
        const safeReply = async (content, options = {}) => {
            try {
                if (interaction) {
                    if (interaction.deferred || interaction.replied) {
                        return interaction.editReply(content);
                    } else {
                        return interaction.reply({ ...options, ...(typeof content === "string" ? { content } : content), flags: 1 << 6 });
                    }
                } else if (message) {
                    return message.reply(content);
                }
            } catch (err) {
                console.error("Reply failed:", err);
            }
        };

        let sub, type, value, index;
        if (interaction) {
            sub = interaction.options.getSubcommand();
            type = interaction.options.getString("type");
            value = interaction.options.getString("value");
            index = interaction.options.getInteger("index");
        } else {
            const args = message.content.trim().split(/\s+/).slice(1);
            sub = args.shift()?.toLowerCase();
            if (sub === "add") {
                type = args.shift();
                value = args.join(" ");
            } else if (sub === "remove") {
                index = parseInt(args[0]);
            }
        }

        // --- ADD ---
        if (sub === "add") {
            if (!type || !value) return safeReply("❌ Provide type and value.");
            setRule(guildId, { type, value, author: user.tag });
            return safeReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Green")
                        .setTitle("✅ AutoMod Rule Added")
                        .setDescription(`**Type:** ${type}\n**Value:** ${value}`)
                        .setFooter({ text: `Added by ${user.tag}` })
                ]
            });
        }

        // --- REMOVE ---
        if (sub === "remove") {
            const ok = removeRule(guildId, index);
            return safeReply(ok ? `✅ Removed AutoMod rule #${index}` : "❌ Invalid index.");
        }

        // --- LIST ---
        if (sub === "list") {
            const db = load()[guildId] || [];
            if (db.length === 0) return safeReply("✨ No AutoMod rules set.");

            const description = db.map((r, i) =>
                `#${i} → **${r.type}**: ${r.value} (by ${r.author})`
            ).join("\n");

            return safeReply({
                embeds: [new EmbedBuilder()
                    .setColor("Blue")
                    .setTitle("🛡️ AutoMod Rules")
                    .setDescription(description)
                ]
            });
        }

        return safeReply("❌ Invalid subcommand.");
    }
};
