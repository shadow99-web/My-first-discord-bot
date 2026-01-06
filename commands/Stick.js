
const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
} = require("discord.js");

const {
  addSticky,
  removeSticky,
  listStickies,
} = require("../utils/stickyHelpers");

module.exports = {
  name: "stick",
  description: "Manage sticky messages",

  data: new SlashCommandBuilder()
    .setName("stick")
    .setDescription("Sticky message system")
    .addSubcommand(sub =>
      sub
        .setName("add")
        .setDescription("Add a sticky message")
        .addStringOption(opt =>
          opt.setName("message")
            .setDescription("Message to stick")
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName("remove")
        .setDescription("Remove sticky message from this channel")
    )
    .addSubcommand(sub =>
      sub
        .setName("list")
        .setDescription("List all sticky messages in this server")
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(context) {
    const guild = context.isPrefix
      ? context.message.guild
      : context.interaction.guild;

    const channel = context.isPrefix
      ? context.message.channel
      : context.interaction.channel;

    const author = context.isPrefix
      ? context.message.author
      : context.interaction.user;

    /* 🔐 ADMIN / DEV ONLY */
    const isDev = author.id === process.env.DEV_ID;
    const isAdmin = context.isPrefix
      ? guild.members.cache.get(author.id)?.permissions.has(
          PermissionFlagsBits.Administrator
        )
      : context.interaction.memberPermissions?.has(
          PermissionFlagsBits.Administrator
        );

    if (!isAdmin && !isDev) {
      return context.isPrefix
        ? context.message.reply("<a:logox:1440322965412642886>  Only **Admins** can use this command.")
        : context.interaction.reply({
            content: "<a:logox:1440322965412642886>  Only **Admins** can use this command.",
            ephemeral: true,
          });
    }

    const sub = context.isPrefix
      ? context.args[0]?.toLowerCase()
      : context.interaction.options.getSubcommand();

    /* ───────── ADD ───────── */
    if (sub === "add") {
      const message = context.isPrefix
        ? context.args.slice(1).join(" ")
        : context.interaction.options.getString("message");

      if (!message) {
        return context.isPrefix
          ? context.message.reply("<a:logox:1440322965412642886>  Please provide a message.")
          : context.interaction.reply({
              content: "<a:logox:1440322965412642886>  Please provide a message.",
              ephemeral: true,
            });
      }

      await addSticky({
        guildId: guild.id,
        channelId: channel.id,
        message,
        authorId: author.id,
      });

      return context.isPrefix
        ? channel.send("<a:purple_verified:1439271259190988954>  Sticky message added.")
        : context.interaction.reply("<a:purple_verified:1439271259190988954>  Sticky message added.");
    }

    /* ───────── REMOVE ───────── */
    if (sub === "remove") {
      await removeSticky({
        guildId: guild.id,
        channelId: channel.id,
      });

      return context.isPrefix
        ? context.message.reply("<a:purple_verified:1439271259190988954>  Sticky message removed.")
        : context.interaction.reply({
            content: "<a:purple_verified:1439271259190988954>  Sticky message removed.",
            ephemeral: true,
          });
    }

    /* ───────── LIST ───────── */
    if (sub === "list") {
      const stickies = await listStickies(guild.id);

      if (!stickies.length) {
        return context.isPrefix
          ? context.message.reply("<a:purple_verified:1439271259190988954>  No sticky messages found.")
          : context.interaction.reply({
              content: "<a:purple_verified:1439271259190988954>  No sticky messages found.",
              ephemeral: true,
            });
      }

      const embed = new EmbedBuilder()
        .setColor("Blue")
        .setTitle("<a:dot:1456901127890141290> Sticky Messages")
        .setDescription(
          stickies
            .map(
              s =>
                `• <#${s.channelId}>\n> ${s.message.slice(0, 100)}`
            )
            .join("\n\n")
        )
        .setFooter({ text: `Total: ${stickies.length}` })
        .setTimestamp();

      return context.isPrefix
        ? context.message.reply({ embeds: [embed] })
        : context.interaction.reply({ embeds: [embed] });
    }
  },
};
