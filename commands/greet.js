const {
    SlashCommandBuilder,
    EmbedBuilder,
    ChannelType,
    PermissionFlagsBits,
    MessageFlags
} = require("discord.js");

const fetch = global.fetch || require("node-fetch");
const {
    addGreet,
    removeGreet,
    getGreet,
    setChannel
} = require("../Handlers/greetHandler");

module.exports = {
    name: "greet",
    description: "Manage greet messages",

    data: new SlashCommandBuilder()
        .setName("greet")
        .setDescription("Manage greet messages")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(sub =>
            sub.setName("add")
                .setDescription("Add a greet message")
                .addStringOption(opt =>
                    opt.setName("text")
                        .setDescription("Greeting text (supports {user}, {server}, {count})")
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
                .setDescription("Set greet channel")
                .addChannelOption(opt =>
                    opt.setName("target")
                        .setDescription("Select a text channel")
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)
                )
        ),

    async execute({ interaction, message, args, isPrefix }) {
        try {
            const guild = interaction?.guild || message?.guild;
            if (!guild) return;

            const user = interaction?.user || message?.author;
            const member = interaction?.member || message?.member;

            /* -------------------- PERMISSIONS -------------------- */
            if (
                !member.permissions.has(PermissionFlagsBits.ManageGuild) &&
                !member.permissions.has(PermissionFlagsBits.Administrator)
            ) {
                const reply = "❌ You don’t have permission to use this command.";
                if (isPrefix) return message.reply(reply);
                return interaction.reply({ content: reply, flags: MessageFlags.Ephemeral });
            }

            const sub = isPrefix
                ? args[0]?.toLowerCase()
                : interaction.options.getSubcommand();

            /* ==================== ADD ==================== */
            if (sub === "add") {
                const text = isPrefix
                    ? args.slice(1).join(" ")
                    : interaction.options.getString("text") || "";

                let file = null;

                if (isPrefix && message.attachments.first()) {
                    const a = message.attachments.first();
                    file = {
                        url: a.url,
                        name: a.name,
                        contentType: a.contentType
                    };
                }

                if (!isPrefix) {
                    const a = interaction.options.getAttachment("file");
                    if (a) {
                        file = {
                            url: a.url,
                            name: a.name,
                            contentType: a.contentType
                        };
                    }
                }

                if (!text && !file) {
                    const reply = "❌ Provide text or an attachment.";
                    if (isPrefix) return message.reply(reply);
                    return interaction.reply({ content: reply, flags: MessageFlags.Ephemeral });
                }

                if (await getGreet(guild.id)) {
                    const reply = "❌ A greet already exists. Remove it first.";
                    if (isPrefix) return message.reply(reply);
                    return interaction.reply({ content: reply, flags: MessageFlags.Ephemeral });
                }

                await addGreet(guild.id, {
                    text,
                    attachment: file,
                    author: user.tag
                });

                const embed = new EmbedBuilder()
                    .setColor("Green")
                    .setTitle("✅ Greet Added")
                    .setDescription(text || "(Attachment only)")
                    .setFooter({ text: `Added by ${user.tag}` });

                if (isPrefix) return message.reply({ embeds: [embed] });
                return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
            }

            /* ==================== REMOVE ==================== */
            if (sub === "remove") {
                const ok = await removeGreet(guild.id);
                const reply = ok ? "✅ Greet removed." : "❌ No greet set.";

                if (isPrefix) return message.reply(reply);
                return interaction.reply({ content: reply, flags: MessageFlags.Ephemeral });
            }

            /* ==================== VIEW ==================== */
            if (sub === "view") {
                const g = await getGreet(guild.id);
                if (!g) {
                    const reply = "✨ No greet message set.";
                    if (isPrefix) return message.reply(reply);
                    return interaction.reply({ content: reply, flags: MessageFlags.Ephemeral });
                }

                const embed = new EmbedBuilder()
                    .setColor("Blue")
                    .setTitle("🌸 Greet Preview")
                    .setFooter({ text: `Added by ${g.author}` });

                if (g.text?.trim()) {
                    embed.setDescription(
                        g.text
                            .replace(/{user}/gi, user.toString())
                            .replace(/{server}/gi, guild.name)
                            .replace(/{count}/gi, guild.memberCount.toString())
                    );
                } else {
                    embed.setDescription("📎 Attachment-only greet.");
                }

                const files = [];

                if (g.attachment?.url) {
                    try {
                        const res = await fetch(g.attachment.url);
                        if (res.ok) {
                            const buffer = await res.buffer();
                            const name = g.attachment.name || "preview.png";

                            files.push({ attachment: buffer, name });

                            if (g.attachment.contentType?.startsWith("image")) {
                                embed.setImage(`attachment://${name}`);
                            }
                        }
                    } catch {
                        // Ignore expired attachment
                    }
                }

                if (isPrefix) return message.reply({ embeds: [embed], files });
                return interaction.reply({
                    embeds: [embed],
                    files,
                    flags: MessageFlags.Ephemeral
                });
            }

            /* ==================== CHANNEL ==================== */
            if (sub === "channel") {
                const channel = isPrefix
                    ? message.mentions.channels.first()
                    : interaction.options.getChannel("target");

                if (!channel || channel.type !== ChannelType.GuildText) {
                    const reply = "❌ Please select a valid text channel.";
                    if (isPrefix) return message.reply(reply);
                    return interaction.reply({ content: reply, flags: MessageFlags.Ephemeral });
                }

                await setChannel(guild.id, channel.id);

                const embed = new EmbedBuilder()
                    .setColor("Purple")
                    .setTitle("✅ Greet Channel Set")
                    .setDescription(`Greet messages will be sent in ${channel}`)
                    .setFooter({ text: `Set by ${user.tag}` });

                if (isPrefix) return message.reply({ embeds: [embed] });
                return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
            }

            /* ==================== INVALID ==================== */
            if (isPrefix) {
                return message.reply("❓ Unknown subcommand. Use `add`, `remove`, `view`, or `channel`.");
            }

        } catch (err) {
            console.error("Greet command error:", err);

            if (isPrefix) {
                return message.reply("⚠️ Error running greet command.").catch(() => {});
            }

            if (interaction && !interaction.replied) {
                return interaction.reply({
                    content: "⚠️ Error running greet command.",
                    flags: MessageFlags.Ephemeral
                }).catch(() => {});
            }
        }
    }
};
