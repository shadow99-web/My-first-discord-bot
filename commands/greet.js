// Commands/greet.js
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { addGreet, removeGreet, load } = require("../Handlers/greetHandler");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("greet")
        .setDescription("Manage greet message")
        .addSubcommand(sub =>
            sub.setName("add")
                .setDescription("Add or replace the greet message")
                .addStringOption(opt =>
                    opt.setName("text")
                        .setDescription("Greeting text (supports {user}, {server}, {count})")
                        .setRequired(false)
                )
                .addAttachmentOption(opt =>
                    opt.setName("file")
                        .setDescription("Optional attachment")
                )
        )
        .addSubcommand(sub =>
            sub.setName("remove")
                .setDescription("Remove the greet message")
        )
        .addSubcommand(sub =>
            sub.setName("list")
                .setDescription("Show the greet message")
        ),

    async execute({ interaction, message }) {
        const guildId = interaction?.guildId || message.guild.id;
        const user = interaction?.user || message.author;

        const reply = async (content) => {
            if (interaction) return interaction.reply({ ...content, ephemeral: true });
            if (message) return message.reply(content);
        };

        let sub, text, file;
        if (interaction) {
            sub = interaction.options.getSubcommand();
            text = interaction.options.getString("text");
            file = interaction.options.getAttachment("file");
        } else {
            const args = message.content.trim().split(/\s+/).slice(1);
            sub = args.shift()?.toLowerCase();
            if (sub === "add") {
                text = args.join(" ");
                if (message.attachments.size > 0) file = message.attachments.first();
            }
        }

        // --- ADD ---
        if (sub === "add") {
            if (!text && !file) return reply("❌ Provide at least text or an attachment!");

            // overwrite greet for this guild
            addGreet(guildId, {
                text: text || "",
                attachment: file ? file.url : null,
                author: user.tag
            }, true); // true = overwrite mode

            return reply({
                embeds: [new EmbedBuilder()
                    .setColor("Green")
                    .setTitle("✅ Greet Set")
                    .setDescription(`Text: ${text || "(attachment only)"}`)
                    .setFooter({ text: `Set by ${user.tag}` })
                ]
            });
        }

        // --- REMOVE ---
        if (sub === "remove") {
            const ok = removeGreet(guildId);
            return reply(ok ? "✅ Greet removed." : "❌ No greet set.");
        }

        // --- LIST ---
        if (sub === "list") {
            const db = load()[guildId];
            if (!db) return reply("✨ No greet set.");
            return reply({
                embeds: [new EmbedBuilder()
                    .setColor("Blue")
                    .setTitle("🌸 Current Greet")
                    .setDescription(`${db.text || ""} ${db.attachment ? "📎" : ""}`)
                    .setFooter({ text: `Set by ${db.author}` })
                ]
            });
        }

        return reply("❌ Invalid subcommand.");
    }
};
