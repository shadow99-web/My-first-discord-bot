// Commands/greet.js
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { addGreet, removeGreet, load } = require("../Handlers/greetHandler");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("greet")
        .setDescription("Manage greet messages")
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
                .setDescription("Remove a greet message")
                .addIntegerOption(opt =>
                    opt.setName("index")
                        .setDescription("Index of greet to remove (use list)")
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName("list")
                .setDescription("List all greet messages")
        ),

    async execute({ interaction, message }) {
        const guildId = interaction?.guildId || message.guild.id;
        const user = interaction?.user || message.author;

        const reply = async (content) => {
            if (interaction) return interaction.reply({ ...content, ephemeral: true });
            if (message) return message.reply(content);
        };

        let sub, text, file, index;
        if (interaction) {
            sub = interaction.options.getSubcommand();
            text = interaction.options.getString("text");
            file = interaction.options.getAttachment("file");
            index = interaction.options.getInteger("index");
        } else {
            const args = message.content.trim().split(/\s+/).slice(1);
            sub = args.shift()?.toLowerCase();
            if (sub === "add") {
                text = args.join(" ");
                if (message.attachments.size > 0) file = message.attachments.first();
            } else if (sub === "remove") {
                index = parseInt(args[0]);
            }
        }

        // --- ADD ---
        if (sub === "add") {
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
            const ok = removeGreet(guildId, index);
            return reply(ok ? `✅ Removed greet #${index}` : "❌ Invalid index.");
        }

        // --- LIST ---
        if (sub === "list") {
            const db = load()[guildId] || [];
            if (db.length === 0) return reply("✨ No greets set.");
            const description = db.map((g, i) =>
                `#${i} → ${g.text || ""} ${g.attachment ? "📎" : ""}`
            ).join("\n");
            return reply({
                embeds: [new EmbedBuilder()
                    .setColor("Blue")
                    .setTitle("🌸 Greet Messages")
                    .setDescription(description)
                ]
            });
        }

        return reply("❌ Invalid subcommand.");
    }
};
