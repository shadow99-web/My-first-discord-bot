// Commands/greet.js
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { addGreet, removeGreet, load } = require("../Handlers/greetHandler");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("greet")
        .setDescription("Manage greet message")
        .addSubcommand(sub =>
            sub.setName("add")
                .setDescription("Add a greet message")
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
            sub.setName("view")
                .setDescription("View current greet message")
        ),

    async execute({ interaction, message }) {
        const guildId = interaction?.guildId || message.guild.id;
        const user = interaction?.user || message.author;

        // --- SAFE REPLY WRAPPER ---
        const reply = async (content) => {
            if (interaction) {
                if (typeof content === "string") {
                    return interaction.reply({ content, ephemeral: true });
                } else {
                    return interaction.reply({ ...content, ephemeral: true });
                }
            }
            if (message) {
                if (typeof content === "string") {
                    return message.reply(content);
                } else {
                    return message.reply(content);
                }
            }
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
            const db = load()[guildId] || [];
            if (db.length > 0) {
                return reply("❌ This server already has a greet message! Remove it first.");
            }

            if (!text && !file) return reply("❌ Provide at least text or an attachment!");

            addGreet(guildId, {
                text: text || "",
                attachment: file ? file.url : null,
                author: user.tag
            });

            return reply({
                embeds: [new EmbedBuilder()
                    .setColor("Green")
                    .setTitle("✅ Greet Added")
                    .setDescription(`Text: ${text || "(attachment only)"}`)
                    .setFooter({ text: `Added by ${user.tag}` })
                ]
            });
        }

        // --- REMOVE ---
        if (sub === "remove") {
            const ok = removeGreet(guildId);
            return reply(ok ? "✅ Greet removed." : "❌ No greet message set.");
        }

        // --- VIEW ---
        if (sub === "view") {
            const db = load()[guildId] || [];
            if (db.length === 0) return reply("✨ No greet message set.");

            const g = db[0];
            return reply({
                embeds: [new EmbedBuilder()
                    .setColor("Blue")
                    .setTitle("🌸 Current Greet Message")
                    .setDescription(g.text || "(attachment only)")
                    .setFooter({ text: `Added by ${g.author}` })
                ],
                files: g.attachment ? [g.attachment] : []
            });
        }

        return reply("❌ Invalid subcommand.");
    }
};
