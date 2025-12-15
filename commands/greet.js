const { SlashCommandBuilder, EmbedBuilder, ChannelType, PermissionFlagsBits, MessageFlags } = require("discord.js");
const { addGreet, removeGreet, getGreet, setChannel } = require("../Handlers/greetHandler");

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

    // Unified command handler for both slash & prefix
    async execute({ interaction, message, args, isPrefix }) {
        try {
            const guild = interaction?.guild || message?.guild;
            if (!guild) return;

            const user = interaction?.user || message?.author;
            const member = interaction?.member || message?.member;

            // Permission check
            if (!member.permissions.has(PermissionFlagsBits.ManageGuild) &&
                !member.permissions.has(PermissionFlagsBits.Administrator)) {
                const reply = "❌ You don’t have permission to use this command.";
                if (isPrefix && message) return message.reply(reply);
                if (interaction) return interaction.reply({ content: reply, flags: MessageFlags.Ephemeral });
            }

            // Determine subcommand
            const sub = isPrefix ? args[0]?.toLowerCase() : interaction.options.getSubcommand();

            // ----- ADD -----
            if (sub === "add") {
                const text = isPrefix ? args.slice(1).join(" ") : interaction.options.getString("text") || "";
                const file = isPrefix ? null : interaction.options.getAttachment("file");

                if (!text && !file) {
                    const reply = "❌ Provide text or an attachment!";
                    if (isPrefix && message) return message.reply(reply);
                    if (interaction) return interaction.reply({ content: reply, flags: MessageFlags.Ephemeral });
                }

                const existing = await getGreet(guild.id);
                if (existing) {
                    const reply = "❌ A greet already exists! Remove it first.";
                    if (isPrefix && message) return message.reply(reply);
                    if (interaction) return interaction.reply({ content: reply, flags: MessageFlags.Ephemeral });
                }

                await addGreet(guild.id, { text, attachment: file?.url || null, author: user.tag });
                const embed = new EmbedBuilder()
                    .setColor("Green")
                    .setTitle("<a:purple_verified:1439271259190988954> Greet Added")
                    .setDescription(text || "(attachment only)")
                    .setFooter({ text: `Added by ${user.tag}` });

                if (isPrefix && message) return message.reply({ embeds: [embed] });
                if (interaction) return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
            }

            // ----- REMOVE -----
            if (sub === "remove") {
                const ok = await removeGreet(guild.id);
                const reply = ok ? "<a:purple_verified:1439271259190988954> Greet removed." : "❌ No greet set.";
                if (isPrefix && message) return message.reply(reply);
                if (interaction) return interaction.reply({ content: reply, flags: MessageFlags.Ephemeral });
            }

            // ----- VIEW -----
            if (sub === "view") {
                const g = await getGreet(guild.id);
                if (!g) {
                    const reply = "✨ No greet message set.";
                    if (isPrefix && message) return message.reply(reply);
                    if (interaction) return interaction.reply({ content: reply, flags: MessageFlags.Ephemeral });
                }

                
                    

                const embed = new EmbedBuilder()
  .setColor("Blue")
  .setTitle("🌸 Current Greet Message (Preview)")
  .setFooter({ text: `Added by ${g.author}` });

if (g.text && g.text.trim().length > 0) {
  embed.setDescription(
    g.text
      .replace(/{user}/gi, user?.toString() || "User")
      .replace(/{server}/gi, guild?.name || "Server")
      .replace(/{count}/gi, guild?.memberCount?.toString() || "0")
  );
} else {
  embed.setDescription("📎 Greet message contains only an attachment.");
}

                if (g.attachment) {
                    if (/\.(jpg|jpeg|png|gif|webp)$/i.test(g.attachment)) embed.setImage(g.attachment);
                    if (isPrefix && message) return message.reply({ embeds: [embed], files: g.attachment && !/\.(jpg|jpeg|png|gif|webp)$/i.test(g.attachment) ? [g.attachment] : [] });
                    if (interaction) return interaction.reply({ embeds: [embed], files: g.attachment && !/\.(jpg|jpeg|png|gif|webp)$/i.test(g.attachment) ? [g.attachment] : [], flags: MessageFlags.Ephemeral });
                }

                if (isPrefix && message) return message.reply({ embeds: [embed] });
                if (interaction) return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
            }

            // ----- CHANNEL -----
            if (sub === "channel") {
                const channel = isPrefix ? message.mentions.channels.first() : interaction.options.getChannel("target");
                if (!channel?.id || channel.type !== ChannelType.GuildText) {
                    const reply = "❌ Please select a valid text channel!";
                    if (isPrefix && message) return message.reply(reply);
                    if (interaction) return interaction.reply({ content: reply, flags: MessageFlags.Ephemeral });
                }

                await setChannel(guild.id, channel.id);
                const embed = new EmbedBuilder()
                    .setColor("Purple")
                    .setTitle("<a:purple_verified:1439271259190988954> Greet Channel Set")
                    .setDescription(`All greet messages will now be sent in ${channel}`)
                    .setFooter({ text: `Set by ${user.tag}` });

                if (isPrefix && message) return message.reply({ embeds: [embed] });
                if (interaction) return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
            }

        } catch (err) {
            console.error("❌ Greet command error:", err);
            if (isPrefix && message) return message.reply("⚠️ Error running greet command.").catch(() => {});
            if (interaction && !interaction.replied) return interaction.reply({ content: "⚠️ Error running greet command.", flags: MessageFlags.Ephemeral }).catch(() => {});
        }
    }
};
