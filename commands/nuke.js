const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("nuke")
        .setDescription("Deletes and recreates the current channel (Developer only)"),

    async execute(interactionOrMessage, client) {
        const isSlash = !!interactionOrMessage.isCommand;
        const user = isSlash ? interactionOrMessage.user : interactionOrMessage.author;
        const channel = isSlash ? interactionOrMessage.channel : interactionOrMessage.channel;
        const guild = channel.guild;

        const devIds = ["1378954077462986772"];

        if (!devIds.includes(user.id))
            return isSlash
                ? interactionOrMessage.reply({ content: "❌ Only developers can use this command.", flags: 64 })
                : channel.send("❌ Only developers can use this command.");

        if (!guild.members.me.permissions.has(PermissionsBitField.Flags.ManageChannels))
            return isSlash
                ? interactionOrMessage.reply({ content: "❌ I need Manage Channels permission.", flags: 64 })
                : channel.send("❌ I need Manage Channels permission.");

        try {
            const newChannel = await channel.clone();
            await channel.delete();

            const embed = new EmbedBuilder()
                .setTitle("💥 Channel Nuked!")
                .setDescription(`Channel recreated by <@${user.id}>`)
                .setColor("Red")
                .setImage("https://media.tenor.com/8vN6VbB3FSgAAAAC/explosion-nuke.gif");

            await newChannel.send({ embeds: [embed] });
        } catch (err) {
            console.error("Nuke Error:", err);
            if (isSlash)
                interactionOrMessage.reply({ content: `❌ Failed: ${err.message}`, flags: 64 });
            else
                channel.send(`❌ Failed: ${err.message}`);
        }
    }
};
