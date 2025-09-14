const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { enableFeature, disableFeature, addBadword, removeBadword, load } = require("../Handlers/automodHandler");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("automod")
        .setDescription("Manage automod system")
        .addSubcommand(sub =>
            sub.setName("enable")
                .setDescription("Enable an automod feature")
                .addStringOption(opt =>
                    opt.setName("feature")
                        .setDescription("Feature (badwords, antilink)")
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName("disable")
                .setDescription("Disable an automod feature")
                .addStringOption(opt =>
                    opt.setName("feature")
                        .setDescription("Feature (badwords, antilink)")
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName("addword")
                .setDescription("Add a banned word")
                .addStringOption(opt =>
                    opt.setName("word")
                        .setDescription("Word to ban")
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName("removeword")
                .setDescription("Remove a banned word")
                .addStringOption(opt =>
                    opt.setName("word")
                        .setDescription("Word to remove")
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName("list")
                .setDescription("List current automod settings")
        ),

    async execute({ interaction, message }) {
        const guildId = interaction?.guildId || message.guild.id;
        const user = interaction?.user || message.author;

        const reply = async (content) => {
            if (interaction) {
                if (typeof content === "string") return interaction.reply({ content, ephemeral: true });
                else return interaction.reply({ ...content, ephemeral: true });
            }
            if (message) {
                if (typeof content === "string") return message.reply(content);
                else return message.reply(content);
            }
        };

        let sub, feature, word;
        if (interaction) {
            sub = interaction.options.getSubcommand();
            feature = interaction.options.getString("feature");
            word = interaction.options.getString("word");
        } else {
            const args = message.content.trim().split(/\s+/).slice(1);
            sub = args.shift()?.toLowerCase();
            if (sub === "enable" || sub === "disable") feature = args[0];
            if (sub === "addword" || sub === "removeword") word = args[0];
        }

        if (sub === "enable") {
            if (!feature) return reply("❌ Provide a feature to enable (`badwords` or `antilink`).");
            enableFeature(guildId, feature);
            return reply(`✅ Enabled **${feature}** automod.`);
        }

        if (sub === "disable") {
            if (!feature) return reply("❌ Provide a feature to disable (`badwords` or `antilink`).");
            disableFeature(guildId, feature);
            return reply(`✅ Disabled **${feature}** automod.`);
        }

        if (sub === "addword") {
            if (!word) return reply("❌ Provide a word to ban.");
            addBadword(guildId, word);
            return reply(`✅ Added banned word: \`${word}\``);
        }

        if (sub === "removeword") {
            if (!word) return reply("❌ Provide a word to remove.");
            removeBadword(guildId, word);
            return reply(`✅ Removed banned word: \`${word}\``);
        }

        if (sub === "list") {
            const data = load()[guildId] || { enabled: [], badwords: [] };
            const embed = new EmbedBuilder()
                .setColor("Blue")
                .setTitle("⚙️ Automod Settings")
                .setDescription(
                    `**Enabled:** ${data.enabled.length ? data.enabled.join(", ") : "None"}\n` +
                    `**Banned Words:** ${data.badwords.length ? data.badwords.join(", ") : "None"}`
                )
                .setFooter({ text: `Requested by ${user.tag}` })
                .setTimestamp();
            return reply({ embeds: [embed] });
        }

        return reply("❌ Invalid subcommand.");
    }
};
