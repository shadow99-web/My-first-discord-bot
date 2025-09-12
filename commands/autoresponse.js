// Commands/autoresponse.js
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { addResponse, removeResponse, load } = require("../Handlers/autoresponseHandler");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("autoresponse")
        .setDescription("Manage autoresponses")
        .addSubcommand(sub =>
            sub.setName("add")
                .setDescription("Add an autoresponse")
                .addStringOption(opt =>
                    opt.setName("trigger")
                        .setDescription("Trigger word")
                        .setRequired(true)
                )
                .addStringOption(opt =>
                    opt.setName("response")
                        .setDescription("Text response")
                        .setRequired(false)
                )
                .addAttachmentOption(opt =>
                    opt.setName("file")
                        .setDescription("Optional attachment (gif, image, video)")
                )
        )
        .addSubcommand(sub =>
            sub.setName("remove")
                .setDescription("Remove an autoresponse")
                .addStringOption(opt =>
                    opt.setName("trigger")
                        .setDescription("Trigger word")
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName("list")
                .setDescription("List all autoresponses")
        ),

    async execute({ interaction, message }) {
        const guildId = interaction?.guildId || message.guild.id;
        const user = interaction?.user || message.author;

        // safe reply wrapper
        const reply = async (content) => {
            if (!content) return; // avoid empty replies
            if (interaction) return interaction.reply({ ...content, ephemeral: true });
            if (message) return message.reply(content);
        };

        // subcommand handling
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
            response = args.join(" ");
            if (message.attachments.size > 0) file = message.attachments.first();
        }

        // --- Add Autoresponse ---
        if (sub === "add") {
            if (!trigger) return reply("❌ You must provide a trigger word.");
            if (!response && !file) return reply("❌ Provide at least a response message or an attachment!");

            const attachments = file ? [file.url] : [];
            addResponse(guildId, trigger, { text: response || "", attachments });

            return reply({
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

        // --- Remove Autoresponse ---
        if (sub === "remove") {
            if (!trigger) return reply("❌ Provide a trigger word to remove.");
            const success = removeResponse(guildId, trigger);
            if (success) return reply(`✅ Removed autoresponse for \`${trigger}\``);
            return reply("❌ No autoresponse found for that trigger.");
        }

        // --- List Autoresponses ---
        if (sub === "list") {
            const data = load()[guildId] || {};
            const entries = Object.entries(data);

            if (entries.length === 0) return reply("✨ No autoresponses set.");

            const description = entries.map(([t, r]) =>
                `🔹 **${t}** → ${r.text || ""} ${r.attachments?.length ? `📎 [${r.attachments.length} file(s)]` : ""}`
            ).join("\n");

            const embed = new EmbedBuilder()
                .setColor("Blue")
                .setTitle("💓 Autoresponses")
                .setDescription(description || "⭐ No autoresponses set.")
                .setTimestamp();

            return reply({ embeds: [embed] });
        }

        // invalid subcommand
        return reply("❌ Invalid subcommand! Use add, remove, or list.");
    }
};
