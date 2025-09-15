// Commands/greet.js
const { SlashCommandBuilder, EmbedBuilder, ChannelType } = require("discord.js");
const { addGreet, removeGreet, getGreet, setChannel } = require("../Handlers/greetHandler");

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

    async execute(interaction) {
        const guildId = interaction.guild.id;
        const user = interaction.user;

        // --- ADD ---
        if (interaction.options.getSubcommand() === "add") {
            const text = interaction.options.getString("text");
            const file = interaction.options.getAttachment("file");

            const existing = await getGreet(guildId);
            if (existing) {
                return interaction.reply({ content: "❌ A greet message already exists! Remove it first.", ephemeral: true });
            }

            if (!text && !file) {
                return interaction.reply({ content: "❌ Provide at least text or an attachment!", ephemeral: true });
            }

            await addGreet(guildId, {
                text: text || "",
                attachment: file ? file.url : null,
                author: user.tag,
            });

            return interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor("Green")
                    .setTitle("✅ Greet Added")
                    .setDescription(`Text: ${text || "(attachment only)"}`)
                    .setFooter({ text: `Added by ${user.tag}` })
                ],
                ephemeral: true,
            });
        }

        // --- REMOVE ---
        if (interaction.options.getSubcommand() === "remove") {
            const ok = await removeGreet(guildId);
            return interaction.reply({ content: ok ? "✅ Greet removed." : "❌ No greet message set.", ephemeral: true });
        }

        // --- VIEW ---
        if (interaction.options.getSubcommand() === "view") {
            const g = await getGreet(guildId);
            if (!g) return interaction.reply({ content: "✨ No greet message set.", ephemeral: true });

            let preview = g.text || "";
            preview = preview
                .replace(/{user}/gi, user.toString())
                .replace(/{server}/gi, interaction.guild.name)
                .replace(/{count}/gi, interaction.guild.memberCount.toString());

            return interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor("Blue")
                    .setTitle("🌸 Current Greet Message (Preview)")
                    .setDescription(preview || "(attachment only)")
                    .setFooter({ text: `Added by ${g.author}` })
                ],
                files: g.attachment ? [g.attachment] : [],
                ephemeral: true,
            });
        }

        // --- CHANNEL ---
        if (interaction.options.getSubcommand() === "channel") {
            const channel = interaction.options.getChannel("target");

            await setChannel(guildId, channel.id);

            return interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor("Purple")
                    .setTitle("✅ Greet Channel Set")
                    .setDescription(`All greet messages will now be sent in ${channel}`)
                    .setFooter({ text: `Set by ${user.tag}` })
                ],
                ephemeral: true,
            });
        }
    }
};
