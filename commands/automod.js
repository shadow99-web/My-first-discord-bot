const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { setAutoMod, getAutoMod, addBadWord, removeBadWord } = require("../Handlers/autoModHandler");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("automod")
        .setDescription("Manage AutoMod settings")
        .addSubcommand(sub =>
            sub.setName("toggle")
                .setDescription("Enable or disable AutoMod features")
                .addStringOption(opt =>
                    opt.setName("feature")
                        .setDescription("Feature to toggle (antilinks, antispam)")
                        .setRequired(true)
                        .addChoices(
                            { name: "Anti Links", value: "antiLinks" },
                            { name: "Anti Spam", value: "antiSpam" }
                        )
                )
                .addBooleanOption(opt =>
                    opt.setName("value")
                        .setDescription("true = enable, false = disable")
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName("badword")
                .setDescription("Add or remove a bad word")
                .addStringOption(opt =>
                    opt.setName("action")
                        .setDescription("Choose add or remove")
                        .setRequired(true)
                        .addChoices(
                            { name: "Add", value: "add" },
                            { name: "Remove", value: "remove" }
                        )
                )
                .addStringOption(opt =>
                    opt.setName("word")
                        .setDescription("The bad word")
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName("mute-duration")
                .setDescription("Set mute duration for AutoMod punishments")
                .addIntegerOption(opt =>
                    opt.setName("minutes")
                        .setDescription("Duration in minutes")
                        .setMinValue(1)
                        .setMaxValue(1440) // up to 1 day
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName("settings")
                .setDescription("View current AutoMod settings")
        ),

    async execute({ interaction, message }) {
        const guildId = interaction?.guildId || message.guild.id;
        const user = interaction?.user || message.author;

        // ✅ Safe reply helper
        const reply = async (content) => {
            if (interaction) {
                if (typeof content === "string") return interaction.reply({ content, ephemeral: true });
                return interaction.reply({ ...content, ephemeral: true });
            } else if (message) {
                if (typeof content === "string") return message.reply(content);
                return message.reply(content);
            }
        };

        let sub, feature, value, action, word, minutes;

        if (interaction) {
            sub = interaction.options.getSubcommand();
            feature = interaction.options.getString("feature");
            value = interaction.options.getBoolean("value");
            action = interaction.options.getString("action");
            word = interaction.options.getString("word");
            minutes = interaction.options.getInteger("minutes");
        } else if (message) {
            // Example: !automod toggle antiLinks true
            const args = message.content.trim().split(/\s+/).slice(1);
            sub = args.shift()?.toLowerCase();

            if (sub === "toggle") {
                feature = args[0];
                value = args[1] === "true";
            } else if (sub === "badword") {
                action = args[0];
                word = args[1];
            } else if (sub === "mute-duration") {
                minutes = parseInt(args[0]);
            }
        }

        // --- TOGGLE ---
        if (sub === "toggle") {
            if (!feature) return reply("❌ Provide a feature: `antiLinks` or `antiSpam`.");
            if (value === undefined) return reply("❌ Provide a value: `true` or `false`.");

            await setAutoMod(guildId, { [feature]: value });

            return reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(value ? "Green" : "Red")
                        .setTitle("⚙️ AutoMod Updated")
                        .setDescription(`**${feature}** is now **${value ? "Enabled ✅" : "Disabled ❌"}**`)
                        .setFooter({ text: `Updated by ${user.tag}` })
                        .setTimestamp()
                ]
            });
        }

        // --- BADWORD ---
        if (sub === "badword") {
            if (!action || !word) return reply("❌ Usage: `badword add <word>` or `badword remove <word>`");

            if (action === "add") {
                await addBadWord(guildId, word);
                return reply(`✅ Added bad word: \`${word}\``);
            } else if (action === "remove") {
                await removeBadWord(guildId, word);
                return reply(`✅ Removed bad word: \`${word}\``);
            }
        }

        // --- MUTE DURATION ---
        if (sub === "mute-duration") {
            if (!minutes || isNaN(minutes)) return reply("❌ Please provide a valid number of minutes (1–1440).");

            await setAutoMod(guildId, { muteDuration: minutes });

            return reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Orange")
                        .setTitle("⏱️ AutoMod Mute Duration Updated")
                        .setDescription(`Users will now be muted for **${minutes} minutes**.`)
                        .setFooter({ text: `Updated by ${user.tag}` })
                        .setTimestamp()
                ]
            });
        }

        // --- SETTINGS ---
        if (sub === "settings") {
            const settings = await getAutoMod(guildId);

            const embed = new EmbedBuilder()
                .setColor("Blue")
                .setTitle("🔒 AutoMod Settings")
                .addFields(
                    { name: "Anti Links", value: settings.antiLinks ? "✅ Enabled" : "❌ Disabled", inline: true },
                    { name: "Anti Spam", value: settings.antiSpam ? "✅ Enabled" : "❌ Disabled", inline: true },
                    { name: "Mute Duration", value: `${settings.muteDuration} min`, inline: true },
                    { name: "Bad Words", value: settings.badWords.length ? settings.badWords.join(", ") : "None" }
                )
                .setFooter({ text: `Requested by ${user.tag}` })
                .setTimestamp();

            return reply({ embeds: [embed] });
        }

        return reply("❌ Invalid subcommand! Use `toggle`, `badword`, `mute-duration`, or `settings`.");
    }
};
