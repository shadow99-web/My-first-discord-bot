// Commands/greet.js
const { SlashCommandBuilder, EmbedBuilder, ChannelType } = require("discord.js");
const { addGreet, removeGreet, load, setChannel } = require("../Handlers/greetHandler");

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
        )
        .addSubcommand(sub =>
            sub.setName("channel")
                .setDescription("Set the channel where greet messages will be sent")
                .addChannelOption(opt =>
                    opt.setName("target")
                        .setDescription("Select the channel")
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)
                )
        ),

    async execute({ interaction, message }) {
        const guild = interaction?.guild || message.guild;
        const guildId = guild.id;
        const user = interaction?.user || message.author;

        // --- SAFE REPLY WRAPPER ---
        const reply = async (content) => {
            if (interaction) {
                if (typeof content === "string") {
                    return interaction.reply({ content, flags: 1 << 6 });
                } else {
                    return interaction.reply({ ...content, flags: 1 << 6 });
                }
            }
            if (message) {
                return typeof content === "string" ? message.reply(content) : message.reply(content);
            }
        };

        let sub, text, file, channel;
        if (interaction) {
            sub = interaction.options.getSubcommand();
            text = interaction.options.getString("text");
            file = interaction.options.getAttachment("file");
            channel = interaction.options.getChannel("target");
        } else {
            const args = message.content.trim().split(/\s+/).slice(1);
            sub = args.shift()?.toLowerCase();
            if (sub === "add") {
                text = args.join(" ");
                if (message.attachments.size > 0) file = message.attachments.first();
            } else if (sub === "channel") {
                channel = message.mentions.channels.first();
            }
        }

        // --- ADD ---
        if (sub === "add") {
            const db = load()[guildId]?.greet || null;
            if (db) {
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
            const g = load()[guildId]?.greet;
            if (!g) return reply("✨ No greet message set.");

            // 🔄 Replace placeholders
            let preview = g.text || "";
            preview = preview
                .replace(/{user}/gi, user.toString()) // mention
                .replace(/{server}/gi, guild.name)
                .replace(/{count}/gi, guild.memberCount.toString());

            return reply({
                embeds: [new EmbedBuilder()
                    .setColor("Blue")
                    .setTitle("🌸 Current Greet Message (Preview)")
                    .setDescription(preview || "(attachment only)")
                    .setFooter({ text: `Added by ${g.author}` })
                ],
                files: g.attachment ? [g.attachment] : []
            });
        }

        // --- CHANNEL ---
        if (sub === "channel") {
            if (!channel) return reply("❌ Please specify a valid text channel.");

            setChannel(guildId, channel.id);

            return reply({
                embeds: [new EmbedBuilder()
                    .setColor("Purple")
                    .setTitle("✅ Greet Channel Set")
                    .setDescription(`All greet messages will now be sent in ${channel}`)
                    .setFooter({ text: `Set by ${user.tag}` })
                ]
            });
        }

        return reply("❌ Invalid subcommand.");
    }
};
