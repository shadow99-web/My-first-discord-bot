const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const {
    addAutoresponse,
    removeAutoresponse,
    listAutoresponses
} = require("../Handlers/autoresponseHandler");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("autoresponse")
        .setDescription("Manage autoresponses")
        .addSubcommand(sub =>
            sub.setName("add")
                .setDescription("Add an autoresponse")
                .addStringOption(opt => opt.setName("trigger").setDescription("Trigger word").setRequired(true))
                .addStringOption(opt => opt.setName("response").setDescription("Text response").setRequired(false))
                .addAttachmentOption(opt => opt.setName("file").setDescription("Optional attachment (gif, image, video)"))
        )
        .addSubcommand(sub =>
            sub.setName("remove")
                .setDescription("Remove an autoresponse")
                .addStringOption(opt => opt.setName("trigger").setDescription("Trigger word").setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName("list")
                .setDescription("List all autoresponses")
        ),

    async execute({ interaction, message, client, isPrefix }) {
        const guildId = interaction?.guildId || message.guild.id;
        const user = interaction?.user || message.author;

        const reply = async (ctx, content) => {
            if (interaction) return interaction.reply(content);
            if (message) return message.reply(content);
        };

        let sub = null;
        let trigger, response, file;
        if (interaction) {
            sub = interaction.options.getSubcommand();
            trigger = interaction.options.getString("trigger");
            response = interaction.options.getString("response");
            file = interaction.options.getAttachment("file");
        } else if (message) {
            const args = message.content.split(" ").slice(1);
            sub = args.shift();
            trigger = args.shift();
            response = args.join(" ");
            if (message.attachments.size > 0) file = message.attachments.first();
        }

        // --- Add ---
        if (sub === "add") {
            if (!trigger && !response && !file) {
                return reply(interaction || message, "❌ Provide at least a response message or an attachment!");
            }

            let attachments = [];
            if (file) attachments.push(file.url);

            addAutoresponse(guildId, trigger, response || "", attachments);

            return reply(interaction || message, {
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

        // --- Remove ---
        if (sub === "remove") {
            if (!trigger) return reply(interaction || message, "❌ Provide a trigger word to remove.");

            const success = removeAutoresponse(guildId, trigger);
            if (success) return reply(interaction || message, `🗑️ Removed autoresponse for \`${trigger}\``);
            return reply(interaction || message, "❌ No autoresponse found for that trigger.");
        }

        // --- List ---
        if (sub === "list") {
            const data = listAutoresponses(guildId);
            if (Object.keys(data).length === 0) return reply(interaction || message, "📭 No autoresponses set.");

            const embed = new EmbedBuilder()
                .setColor("Blue")
                .setTitle("📜 Autoresponses")
                .setDescription(Object.entries(data).map(([t, r]) =>
                    `🔹 **${t}** → ${r.text || ""} ${r.attachments?.length > 0 ? `📎 [${r.attachments.length} file(s)]` : ""}`
                ).join("\n"))
                .setTimestamp();

            return reply(interaction || message, { embeds: [embed] });
        }
    }
};
