const { SlashCommandBuilder } = require("discord.js");

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
        )
        .addChannelOption(opt =>
            opt.setName("channel")
                .setDescription("Where to send it")
        )
        .addUserOption(opt =>
            opt.setName("user")
                .setDescription("User to impersonate (safely)")
        ),

    async execute({ message, interaction, isPrefix, client }) {

        // ---------------------------------------------------
        // PREFIX
        // ---------------------------------------------------
        if (isPrefix) {
            const args = message.content.split(" ").slice(1);

            const stealth = args[0] === "--stealth";
            if (stealth) args.shift();

            const text = args.join(" ").trim();
            if (!text) return message.reply("❌ Provide text.");

            const channel = message.channel;

            // USE DISPLAY NAME (NICKNAME)
            const name = message.member?.displayName || message.author.username;
            const avatar = message.author.displayAvatarURL();

            let webhook =
                (await channel.fetchWebhooks()).find(w => w.name === "Shadow-Say");

            if (!webhook) {
                webhook = await channel.createWebhook({
                    name: "Shadow-Say",
                    avatar: client.user.displayAvatarURL()
                });
            }

            await webhook.send({
                content: text,
                username: name,
                avatarURL: avatar,
                allowedMentions: { parse: [] }
            });

            if (!stealth) return message.react("✅");
            return;
        }

        // ---------------------------------------------------
        // SLASH COMMAND
        // ---------------------------------------------------
        const text = interaction.options.getString("text").trim();
        const mode = interaction.options.getString("mode") || "normal";
        const channel = interaction.options.getChannel("channel") || interaction.channel;
        const user = interaction.options.getUser("user");

        // FIX EMPTY MESSAGE ISSUE
        if (!text) {
            return interaction.reply({
                content: "❌ Message cannot be empty.",
                ephemeral: true
            });
        }

        // USE DISPLAY NAME IF A USER IS SELECTED
        let name = "Shadow";
        let avatar = client.user.displayAvatarURL();

        if (user) {
            const member = await interaction.guild.members.fetch(user.id).catch(() => null);

            name = member?.displayName || user.username;
            avatar = user.displayAvatarURL({ dynamic: true });
        }

        let webhook =
            (await channel.fetchWebhooks()).find(w => w.name === "Shadow-Say");

        if (!webhook) {
            webhook = await channel.createWebhook({
                name: "Shadow-Say",
                avatar: client.user.displayAvatarURL()
            });
        }

        // STEALTH REPLY FIX — send a real message
        if (mode !== "stealth") {
            await interaction.reply({
                content: "✅ Message sent.",
                ephemeral: true
            });
        } else {
            await interaction.reply({
                content: "✔",
                ephemeral: true
            });
        }

        return webhook.send({
            content: text,
            username: name,
            avatarURL: avatar,
            allowedMentions: { parse: [] }
        });
    }
};
