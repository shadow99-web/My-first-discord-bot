const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require("discord.js");
const fs = require("fs");

const blueHeart = "<a:blue_heart:1414309560231002194>";
const file = "./autorole.json";

// Ensure file exists
if (!fs.existsSync(file)) fs.writeFileSync(file, "{}");
const getData = () => JSON.parse(fs.readFileSync(file, "utf8"));
const saveData = (data) => fs.writeFileSync(file, JSON.stringify(data, null, 4));

module.exports = {
    data: new SlashCommandBuilder()
        .setName("autorole")
        .setDescription("Setup autorole system")
        .addSubcommandGroup(group =>
            group.setName("humans")
                .setDescription("Manage human autoroles")
                .addSubcommand(sub =>
                    sub.setName("add")
                        .setDescription("Add a role for humans")
                        .addRoleOption(opt => opt.setName("role").setDescription("Role to add").setRequired(true))
                )
                .addSubcommand(sub =>
                    sub.setName("remove")
                        .setDescription("Remove a role for humans")
                        .addRoleOption(opt => opt.setName("role").setDescription("Role to remove").setRequired(true))
                )
        )
        .addSubcommandGroup(group =>
            group.setName("bots")
                .setDescription("Manage bot autoroles")
                .addSubcommand(sub =>
                    sub.setName("add")
                        .setDescription("Add a role for bots")
                        .addRoleOption(opt => opt.setName("role").setDescription("Role to add").setRequired(true))
                )
                .addSubcommand(sub =>
                    sub.setName("remove")
                        .setDescription("Remove a role for bots")
                        .addRoleOption(opt => opt.setName("role").setDescription("Role to remove").setRequired(true))
                )
        )
        .addSubcommand(sub =>
            sub.setName("config")
                .setDescription("Show current autorole config")
        )
        .addSubcommand(sub =>
            sub.setName("reset")
                .setDescription("Reset autorole settings for this server")
        ),

    description: "Auto assign roles to new members (humans or bots).",
    usage: ".autorole humans add <role>",

    async execute({ interaction, message, args, isPrefix }) {
        const guildId = isPrefix ? message.guild.id : interaction.guild.id;
        const member = isPrefix ? message.member : interaction.member;

        if (!member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
            const embed = new EmbedBuilder()
                .setColor("Red")
                .setTitle("🚫 Permission Denied")
                .setDescription(`${blueHeart} You need **Manage Server** permission to use autorole commands.`)
                .setTimestamp();
            return isPrefix ? message.reply({ embeds: [embed] }) : interaction.reply({ embeds: [embed], ephemeral: true });
        }

        const data = getData();
        if (!data[guildId]) data[guildId] = { humans: [], bots: [] };

        let sub = "";
        let subGroup = "";
        if (!isPrefix) {
            if (interaction.options.getSubcommandGroup(false)) subGroup = interaction.options.getSubcommandGroup();
            if (interaction.options.getSubcommand(false)) sub = interaction.options.getSubcommand();
        } else {
            // For prefix command parsing
            subGroup = args[0]; // humans/bots/config/reset
            sub = args[1];      // add/remove
        }

        let embed;

        if (subGroup === "humans" && sub === "add") {
            const role = isPrefix ? message.mentions.roles.first() : interaction.options.getRole("role");
            if (!role) return;
            if (!data[guildId].humans.includes(role.id)) data[guildId].humans.push(role.id);
            saveData(data);
            embed = new EmbedBuilder()
                .setColor("Blue")
                .setTitle("✅ Human Autorole Added")
                .setDescription(`${blueHeart} Role <@&${role.id}> will now be given to **humans**.`)
                .setTimestamp();
        }

        else if (subGroup === "humans" && sub === "remove") {
            const role = isPrefix ? message.mentions.roles.first() : interaction.options.getRole("role");
            if (!role) return;
            data[guildId].humans = data[guildId].humans.filter(r => r !== role.id);
            saveData(data);
            embed = new EmbedBuilder()
                .setColor("Orange")
                .setTitle("❌ Human Autorole Removed")
                .setDescription(`${blueHeart} Role <@&${role.id}> removed from **humans autorole**.`)
                .setTimestamp();
        }

        else if (subGroup === "bots" && sub === "add") {
            const role = isPrefix ? message.mentions.roles.first() : interaction.options.getRole("role");
            if (!role) return;
            if (!data[guildId].bots.includes(role.id)) data[guildId].bots.push(role.id);
            saveData(data);
            embed = new EmbedBuilder()
                .setColor("Blue")
                .setTitle("✅ Bot Autorole Added")
                .setDescription(`${blueHeart} Role <@&${role.id}> will now be given to **bots**.`)
                .setTimestamp();
        }

        else if (subGroup === "bots" && sub === "remove") {
            const role = isPrefix ? message.mentions.roles.first() : interaction.options.getRole("role");
            if (!role) return;
            data[guildId].bots = data[guildId].bots.filter(r => r !== role.id);
            saveData(data);
            embed = new EmbedBuilder()
                .setColor("Orange")
                .setTitle("❌ Bot Autorole Removed")
                .setDescription(`${blueHeart} Role <@&${role.id}> removed from **bots autorole**.`)
                .setTimestamp();
        }

        else if (sub === "config") {
            const humanRoles = data[guildId].humans.map(r => `<@&${r}>`).join(", ") || "None";
            const botRoles = data[guildId].bots.map(r => `<@&${r}>`).join(", ") || "None";
            embed = new EmbedBuilder()
                .setColor("Blue")
                .setTitle("⚙️ Autorole Config")
                .setDescription(`${blueHeart} **Humans:** ${humanRoles}\n${blueHeart} **Bots:** ${botRoles}`)
                .setTimestamp();
        }

        else if (sub === "reset") {
            data[guildId] = { humans: [], bots: [] };
            saveData(data);
            embed = new EmbedBuilder()
                .setColor("Red")
                .setTitle("♻️ Autorole Reset")
                .setDescription(`${blueHeart} Autorole configuration has been reset.`)
                .setTimestamp();
        }

        if (embed) {
            return isPrefix ? message.reply({ embeds: [embed] }) : interaction.reply({ embeds: [embed] });
        }
    }
};
