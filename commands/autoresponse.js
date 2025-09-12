const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { addResponse, removeResponse, getResponse, load } = require("../Handlers/autoresponseHandler");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("autoresponse")
        .setDescription("Manage autoresponses")
        .addSubcommand(sub =>
            sub.setName("add")
                .setDescription("Add an autoresponse")
                .addStringOption(opt =>
                    opt.setName("trigger").setDescription("Trigger word").setRequired(true)
                )
                .addStringOption(opt =>
                    opt.setName("response").setDescription("Text response").setRequired(false)
                )
                .addAttachmentOption(opt =>
                    opt.setName("file").setDescription("Optional attachment (gif, image, video)")
                )
        )
        .addSubcommand(sub =>
            sub.setName("remove")
                .setDescription("Remove an autoresponse")
                .addStringOption(opt =>
                    opt.setName("trigger").setDescription("Trigger word").setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName("list").setDescription("List all autoresponses")
        ),

    async execute({ interaction, message }) {
        const guildId = interaction?.guildId || message.guild.id;
        const user = interaction?.user || message.author;

        const safeReply = async (content) => {
            if (interaction) {
                return interaction.reply({ ...content, ephemeral: true });
            }
            if (message) {
                // Strip ephemeral (not valid for message.reply)
                if (content.ephemeral) delete content.ephemeral;
                return message.reply(content);
            }
        };

        // Get inputs
        let sub = null, trigger, response, file;
        if (interaction) {
            sub = interaction.options.getSubcommand();
            trigger = interaction.options.getString("trigger");
            response = interaction.options.getString("response");
            file = interaction.options.getAttachment("file");
        } else if (message) {
            const args = message.content.trim().split(/\s+/).slice(1);
            sub = args.shift()?.toLowerCase();
            trigger = args.shift();
            response = args.join(" ") || null;
            if (message.attachments.size > 0) file = message.attachments.first();
        }

        // --- ADD ---
        if (sub === "add") {
            if (!trigger) return safeReply("❌ You must provide a trigger word.");
            if (!response && !file) return safeReply("❌ Provide at least a response message or an attachment!");

            const attachments = file ? [{ attachment: file.url, name: file.name || "file" }] : [];
            addResponse(guildId, trigger.toLowerCase(), { text: response || "", attachments });

            return safeReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Green")
                        .setTitle("✅ Autoresponse Added")
                        .setDescription(`**Trigger:** \`${trigger}\`\n**Response:** ${response || "(attachment only)"}`)
                        .setFooter({ text: `Added by ${user.tag}` })
                        .setTimestamp()
                ]
            });
        }

        // --- REMOVE ---
        if (sub === "remove") {
            if (!trigger) return safeReply("❌ Provide a trigger word to remove.");
            const success = removeResponse(guildId, trigger.toLowerCase());
            if (success) return safeReply(` Removed autoresponse for \`${trigger}\``);
            return safeReply("❌ No autoresponse found for that trigger.");
        }

        // --- LIST ---
        if (sub === "list") {
            const data = load()[guildId] || {};
            if (Object.keys(data).length === 0) return safeReply(" No autoresponses set.");

            const embed = new EmbedBuilder()
                .setColor("Blue")
                .setTitle(" Autoresponses")
                .setDescription(Object.entries(data).map(([t, r]) =>
                    `🔹 **${t}** → ${r.text || ""} ${r.attachments?.length ? `📎 [${r.attachments.length} file(s)]` : ""}`
                ).join("\n"))
                .setTimestamp();

            return safeReply({ embeds: [embed] });
        }

        // --- Invalid ---
        return safeReply("❌ Invalid subcommand! Use `add`, `remove`, or `list`.");
    }
};
