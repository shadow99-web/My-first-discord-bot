// commands/greet.js
const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require("discord.js");
const { addGreet, removeGreet, getGreet, setChannel, getChannel } = require("../Handlers/greetHandler");

module.exports = {
  name: "greet",
  description: "Manage server greet messages",
  usage: "!greet <add/remove/channel/view> [args]",

  // ---------- Slash Command ----------
  slash: new SlashCommandBuilder()
    .setName("greet")
    .setDescription("Manage server greet messages")
    .addSubcommand(sub =>
      sub
        .setName("add")
        .setDescription("Set or update the greet message")
        .addStringOption(opt =>
          opt.setName("message").setDescription("The greet message").setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName("remove").setDescription("Remove the greet message")
    )
    .addSubcommand(sub =>
      sub
        .setName("channel")
        .setDescription("Set the channel for greet messages")
        .addChannelOption(opt =>
          opt.setName("channel").setDescription("Target channel").setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName("view").setDescription("View the current greet settings")
    ),

  async execute({ client, message, interaction, args, isPrefix }) {
    let sub, greetMsg, channel;

    // --------- Handle Prefix Commands ---------
    if (isPrefix) {
      if (!args[0]) {
        return message.reply("❌ Usage: !greet <add/remove/channel/view>");
      }
      sub = args[0].toLowerCase();
      const member = message.member;

      // Permission check for admin commands
      if (["add", "remove", "channel"].includes(sub) &&
        !member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return message.reply("❌ You need `Administrator` permission to use this command.");
      }

      if (sub === "add") {
        greetMsg = args.slice(1).join(" ");
        if (!greetMsg) return message.reply("❌ Please provide a greet message.");
        await addGreet(message.guild.id, greetMsg);
        return message.reply(`✅ Greet message set:\n\`\`\`${greetMsg}\`\`\``);
      }

      if (sub === "remove") {
        await removeGreet(message.guild.id);
        return message.reply("✅ Greet message removed.");
      }

      if (sub === "channel") {
        if (!message.mentions.channels.first())
          return message.reply("❌ Please mention a channel.");
        const targetChannel = message.mentions.channels.first();
        await setChannel(message.guild.id, targetChannel.id);
        return message.reply(`✅ Greet channel set to ${targetChannel}`);
      }

      if (sub === "view") {
        const greet = await getGreet(message.guild.id);
        const greetChannel = await getChannel(message.guild.id);
        const embed = new EmbedBuilder()
          .setColor("Blue")
          .setTitle("💙 Greet Settings")
          .addFields(
            { name: "Message", value: greet ? `\`\`\`${greet}\`\`\`` : "❌ None" },
            { name: "Channel", value: greetChannel ? `<#${greetChannel}>` : "❌ None" }
          );
        return message.reply({ embeds: [embed] });
      }
    }

    // --------- Handle Slash Commands ---------
    else {
      sub = interaction.options.getSubcommand();
      const member = interaction.member;

      if (["add", "remove", "channel"].includes(sub) &&
        !member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return interaction.reply({ content: "❌ You need `Administrator` permission to use this command.", ephemeral: true });
      }

      if (sub === "add") {
        greetMsg = interaction.options.getString("message");
        await addGreet(interaction.guild.id, greetMsg);
        return interaction.reply(`✅ Greet message set:\n\`\`\`${greetMsg}\`\`\``);
      }

      if (sub === "remove") {
        await removeGreet(interaction.guild.id);
        return interaction.reply("✅ Greet message removed.");
      }

      if (sub === "channel") {
        channel = interaction.options.getChannel("channel");
        await setChannel(interaction.guild.id, channel.id);
        return interaction.reply(`✅ Greet channel set to ${channel}`);
      }

      if (sub === "view") {
        const greet = await getGreet(interaction.guild.id);
        const greetChannel = await getChannel(interaction.guild.id);
        const embed = new EmbedBuilder()
          .setColor("Blue")
          .setTitle("💙 Greet Settings")
          .addFields(
            { name: "Message", value: greet ? `\`\`\`${greet}\`\`\`` : "❌ None" },
            { name: "Channel", value: greetChannel ? `<#${greetChannel}>` : "❌ None" }
          );
        return interaction.reply({ embeds: [embed] });
      }
    }
  }
};
