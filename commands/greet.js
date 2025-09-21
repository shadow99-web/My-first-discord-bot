const { SlashCommandBuilder, EmbedBuilder, ChannelType } = require("discord.js");
const { addGreet, removeGreet, getGreet, setChannel } = require("../Handlers/greetHandler");

module.exports = {
    name: "greet",
    description: "Manage greet messages",
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

    // ========= Slash Command =========
    async execute(interaction) {
        // Safety: only run if valid interaction
        if (!interaction || typeof interaction.reply !== "function") {
            console.error("❌ execute() called with invalid interaction object", interaction);
            return;
        }

        // Safety: must be in a guild
        if (!interaction.guild) {
            return interaction.reply({ content: "❌ This command can only be used in a server.", ephemeral: true });
        }

        const guildId = interaction.guild.id;
        const user = interaction.user;

        try {
            const sub = interaction.options.getSubcommand();

            // ----- ADD -----
            if (sub === "add") {
                const text = interaction.options.getString("text") || "";
                const file = interaction.options.getAttachment("file");

                if (!text && !file) {
                    return interaction.reply({ content: "❌ Provide text or an attachment!", ephemeral: true });
                }

                const existing = await getGreet(guildId);
                if (existing) {
                    return interaction.reply({ content: "❌ A greet already exists! Remove it first.", ephemeral: true });
                }

                await addGreet(guildId, {
                    text,
                    attachment: file?.url || null,
                    author: user.tag,
                });

                return interaction.reply({
                    embeds: [new EmbedBuilder()
                        .setColor("Green")
                        .setTitle("✅ Greet Added")
                        .setDescription(text || "(attachment only)")
                        .setFooter({ text: `Added by ${user.tag}` })
                    ],
                    ephemeral: true,
                });
            }

            // ----- REMOVE -----
            if (sub === "remove") {
                const ok = await removeGreet(guildId);
                return interaction.reply({ content: ok ? "✅ Greet removed." : "❌ No greet set.", ephemeral: true });
            }

            // ----- VIEW -----
            if (sub === "view") {
                const g = await getGreet(guildId);
                if (!g) return interaction.reply({ content: "✨ No greet message set.", ephemeral: true });

                let preview = g.text || "";
                preview = preview
                    .replace(/{user}/gi, user?.toString() || "")
                    .replace(/{server}/gi, interaction.guild?.name || "")
                    .replace(/{count}/gi, interaction.guild?.memberCount?.toString() || "");

                const embed = new EmbedBuilder()
                    .setColor("Blue")
                    .setTitle("🌸 Current Greet Message (Preview)")
                    .setDescription(preview || "")
                    .setFooter({ text: `Added by ${g.author}` });

                if (g.attachment) {
                    // Show image in embed if image, otherwise attach file
                    if (/\.(jpg|jpeg|png|gif|webp)$/i.test(g.attachment)) {
                        embed.setImage(g.attachment);
                        return interaction.reply({ embeds: [embed], ephemeral: true });
                    } else {
                        return interaction.reply({ embeds: [embed], files: [g.attachment], ephemeral: true });
                    }
                }

                return interaction.reply({ embeds: [embed], ephemeral: true });
            }

            // ----- CHANNEL -----
            if (sub === "channel") {
                const channel = interaction.options.getChannel("target");

                if (!channel?.id || channel.type !== ChannelType.GuildText) {
                    return interaction.reply({ content: "❌ Please select a valid text channel!", ephemeral: true });
                }

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

        } catch (err) {
            console.error("❌ Greet Slash Command failed:", err);
            return interaction.reply({ content: "⚠️ Error running greet command.", ephemeral: true }).catch(() => {});
        }
    },

    // ========= Prefix Command =========
    async prefixExecute(message, args) {
        if (!message.guild) return;

        const guildId = message.guild.id;
        const user = message.author;
        const sub = args[0]?.toLowerCase();

        if (!sub) {
            return message.reply("❌ Usage: `!greet add <text>`, `!greet view`, `!greet remove`, `!greet channel #channel`");
        }

        try {
            // ----- ADD -----
            if (sub === "add") {
                const text = args.slice(1).join(" ");
                if (!text) return message.reply("❌ Provide greet text.");

                await addGreet(guildId, { text, attachment: null, author: user.tag });
                return message.reply(`✅ Greet message added: ${text}`);
            }

            // ----- REMOVE -----
            if (sub === "remove") {
                const ok = await removeGreet(guildId);
                return message.reply(ok ? "✅ Greet removed." : "❌ No greet set.");
            }

            // ----- VIEW -----
            if (sub === "view") {
                const g = await getGreet(guildId);
                if (!g) return message.reply("✨ No greet message set.");

                let preview = g.text || "";
                preview = preview
                    .replace(/{user}/gi, user?.toString() || "")
                    .replace(/{server}/gi, message.guild?.name || "")
                    .replace(/{count}/gi, message.guild?.memberCount?.toString() || "");

                const embed = new EmbedBuilder()
                    .setColor("Blue")
                    .setTitle("🌸 Current Greet Message (Preview)")
                    .setDescription(preview)
                    .setFooter({ text: `Added by ${g.author}` });

                if (g.attachment) {
                    if (/\.(jpg|jpeg|png|gif|webp)$/i.test(g.attachment)) {
                        embed.setImage(g.attachment);
                        return message.reply({ embeds: [embed] });
                    } else {
                        return message.reply({ embeds: [embed], files: [g.attachment] });
                    }
                }

                return message.reply({ embeds: [embed] });
            }

            // ----- CHANNEL -----
            if (sub === "channel") {
                const channel = message.mentions.channels.first();

                if (!channel?.id || channel.type !== ChannelType.GuildText) {
                    return message.reply("❌ Mention a valid text channel.");
                }

                await setChannel(guildId, channel.id);
                return message.reply(`✅ Greet channel set to ${channel}`);
            }

        } catch (err) {
            console.error("❌ Greet Prefix Command failed:", err);
            return message.reply("⚠️ Error running greet command.").catch(() => {});
        }
    }
};
