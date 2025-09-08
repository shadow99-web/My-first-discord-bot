const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const fs = require("fs");

const prefixFile = "./prefixes.json";
if (!fs.existsSync(prefixFile)) fs.writeFileSync(prefixFile, "{}");

function getPrefixes() {
    return JSON.parse(fs.readFileSync(prefixFile, "utf8"));
}
function savePrefixes(prefixes) {
    fs.writeFileSync(prefixFile, JSON.stringify(prefixes, null, 4));
}

module.exports = {
    name: "setprefix",
    description: "Set a custom prefix for this server",
    data: new SlashCommandBuilder()
        .setName("setprefix")
        .setDescription("Change the command prefix for this server")
        .addStringOption(option =>
            option.setName("prefix")
                .setDescription("The new prefix to use")
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(context) {
        const blueHeart = "<a:blue_heart_1414309560231002194:1414309560231002194>";
        const guild = context.isPrefix ? context.message.guild : context.interaction.guild;

        // Get the new prefix
        const newPrefix = context.isPrefix 
            ? context.args[0] 
            : context.interaction.options.getString("prefix");

        if (!newPrefix) {
            const errorEmbed = new EmbedBuilder()
                .setColor("Red")
                .setDescription(`${blueHeart} You must provide a new prefix!`);
            return context.isPrefix
                ? context.message.reply({ embeds: [errorEmbed] })
                : context.interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        // Save new prefix
        const prefixes = getPrefixes();
        prefixes[guild.id] = newPrefix;
        savePrefixes(prefixes);

        const embed = new EmbedBuilder()
            .setColor("Blue")
            .setTitle(`${blueHeart} Prefix Updated!`)
            .setDescription(`The new prefix for **${guild.name}** is now: \`${newPrefix}\``)
            .setFooter({ text: `Set by ${context.isPrefix ? context.message.author.tag : context.interaction.user.tag}` })
            .setTimestamp();

        if (context.isPrefix) {
            await context.message.reply({ embeds: [embed] });
        } else {
            await context.interaction.reply({ embeds: [embed] });
        }
    }
};
