const {
    SlashCommandBuilder
} = require("discord.js");

module.exports = {
    prefixName: "say",
    data: new SlashCommandBuilder()
        .setName("say")
        .setDescription("Sends your message from anyone to anywhere")
        .addStringOption(opt =>
            opt.setName("text")
                .setDescription("The text to send")
                .setRequired(true)
        )
        .addStringOption(opt =>
            opt.setName("mode")
                .setDescription("Send silently without confirmation")
                .addChoices(
                    { name: "Normal", value: "normal" },
                    { name: "Stealth", value: "stealth" }
                )
                .setRequired(false)
        )
        .addChannelOption(opt =>
            opt.setName("channel")
                .setDescription("Where to send it")
                .setRequired(false)
        )
        .addUserOption(opt =>
            opt.setName("user")
                .setDescription("User to impersonate (safely)")
                .setRequired(false)
        ),

    async execute({ message, interaction, isPrefix, client }) {

        // -------------------- PREFIX MODE --------------------
        if (isPrefix) {
            const args = message.content.split(" ").slice(1);

            const stealth = args[0] === "--stealth";
            if (stealth) args.shift();

            const text = args.join(" ");
            if (!text) return message.reply("❌ Provide text.");

            const channel = message.channel;

            const name = `${message.author.username} `;
            const avatar = message.author.displayAvatarURL();

            let webhook = (await channel.fetchWebhooks()).find(w => w.name === "Shadow-Say");
            if (!webhook) {
                webhook = await channel.createWebhook({
                    name: "Shadow-Say",
                    avatar: client.user.displayAvatarURL()
                });
            }

            await webhook.send({
                content: text,
                username: name,
                avatarURL: avatar
            });

            if (!stealth) return message.react("✅");
            return; // STEALTH MODE → no reply
        }

        // -------------------- SLASH MODE --------------------
        const text = interaction.options.getString("text");
        const mode = interaction.options.getString("mode") || "normal";
        const channel = interaction.options.getChannel("channel") || interaction.channel;
        const user = interaction.options.getUser("user");

        let name = "Shadow";
        let avatar = client.user.displayAvatarURL();

        if (user) {
            name = `${user.username} `;
            avatar = user.displayAvatarURL({ dynamic: true });
        }

        let webhook = (await channel.fetchWebhooks()).find(w => w.name === "Shadow-Say");
        if (!webhook) {
            webhook = await channel.createWebhook({
                name: "Shadow-Say",
                avatar: client.user.displayAvatarURL()
            });
        }

        if (mode !== "stealth") {
            await interaction.reply({
                content: " Message sent.",
                flags: 64
            });
        } else {
            // STEALTH MODE → acknowledge silently
            await interaction.reply({
                content: " ",
                flags: 64
            });
        }

        return webhook.send({
            content: text,
            username: name,
            avatarURL: avatar
        });
    }
};
