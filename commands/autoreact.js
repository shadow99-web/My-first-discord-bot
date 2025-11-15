const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const AutoReact = require("../models/AutoReact");

module.exports = {
  // Slash metadata for deployer
  data: new SlashCommandBuilder()
    .setName("autoreact")
    .setDescription("Manage auto reactions for certain words (prefix + slash)")
    .addSubcommand(sub =>
      sub.setName("add")
        .setDescription("Add an auto-reaction for a word")
        .addStringOption(o => o.setName("word").setDescription("Word to watch for").setRequired(true))
        .addStringOption(o => o.setName("emoji").setDescription("Emoji to react with (unicode or custom) ").setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName("remove")
        .setDescription("Remove an auto-reaction for a word")
        .addStringOption(o => o.setName("word").setDescription("Word to remove").setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName("list")
        .setDescription("List all auto-reactions for this server")
    ),

  name: "autoreact",
  description: "Manage auto reactions (prefix + slash)",

  // context signature matches your other commands: { interaction, message, client, args, isPrefix, safeReply }
  async execute(context) {
    const { interaction, message, isPrefix, client, safeReply } = context;
    const isSlash = !!interaction;

    // permission check: ManageGuild or ManageMessages -> use ManageGuild
    const member = isSlash ? interaction.member : message.member;
    if (!member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      const noPerm = "⚠️ You need Manage Server permission to manage autoreacts.";
      return isSlash ? interaction.reply({ content: noPerm, ephemeral: true }).catch(()=>{}) : message.reply(noPerm).catch(()=>{});
    }

    // helper to reply
    const reply = async (payload) => {
      if (isSlash) {
        if (interaction.replied || interaction.deferred) return interaction.editReply(payload).catch(()=>{});
        return interaction.reply({ ...payload }).catch(()=>{});
      } else {
        return message.reply(typeof payload === "string" ? payload : payload).catch(()=>{});
      }
    };

    try {
      // get subcommand for slash OR parse prefix
      let sub;
      let word;
      let emoji;

      if (isSlash) {
        if (!interaction.options) return reply({ content: "❌ Invalid interaction.", ephemeral: true });
        sub = interaction.options.getSubcommand();
        if (sub === "add") {
          word = interaction.options.getString("word");
          emoji = interaction.options.getString("emoji");
        } else if (sub === "remove") {
          word = interaction.options.getString("word");
        }
      } else {
        // prefix usage: args = context.args (array)
        const args = context.args || [];
        sub = args[0]?.toLowerCase();
        if (sub === "add") {
          word = args[1];
          emoji = args.slice(2).join(" ");
        } else if (sub === "remove") {
          word = args[1];
        } else if (sub === "list") {
          // ok
        } else {
          return reply({ content: "Usage (prefix): `!autoreact add <word> <emoji>` | `!autoreact remove <word>` | `!autoreact list`" });
        }
      }

      const guildId = isSlash ? interaction.guildId : message.guild.id;

      // ensure lowercase trimmed word
      if (word) {
        word = word.trim().toLowerCase();
        if (word.length === 0) return reply({ content: "❌ Invalid word." });
      }

      if (sub === "add") {
        if (!emoji) return reply({ content: "❌ Please provide an emoji (unicode or custom like `<:name:id>`)." });

        // upsert doc
        let doc = await AutoReact.findOne({ guildId });
        if (!doc) {
          doc = new AutoReact({ guildId, triggers: [] });
        }

        // prevent duplicate same word
        if (doc.triggers.some(t => t.word === word)) {
          return reply({ content: `🔴 A trigger for **${word}** already exists.` });
        }

        doc.triggers.push({
          word,
          emoji: emoji.trim(),
          createdBy: isSlash ? interaction.user.id : message.author.id
        });

        await doc.save();

        const okEmbed = new EmbedBuilder()
          .setColor("#00B7FF")
          .setTitle("✅ Auto-react added")
          .setDescription(`Word: **${word}**\nEmoji: ${emoji}`)
          .setFooter({ text: `Added by ${isSlash ? interaction.user.tag : message.author.tag}` });

        return reply({ embeds: [okEmbed], ephemeral: true });

      } else if (sub === "remove") {
        const doc = await AutoReact.findOne({ guildId });
        if (!doc) return reply({ content: `🔴 No triggers set for this server.` });

        const before = doc.triggers.length;
        doc.triggers = doc.triggers.filter(t => t.word !== word);
        if (doc.triggers.length === before) return reply({ content: `🔴 No trigger found for **${word}**.` });

        await doc.save();
        return reply({ content: `✅ Removed trigger for **${word}**.`, ephemeral: true });

      } else if (sub === "list") {
        const doc = await AutoReact.findOne({ guildId });
        if (!doc || !doc.triggers.length) return reply({ content: "__ No auto-reactions configured for this server__" });

        const lines = doc.triggers.map(t => `• **${t.word}** → ${t.emoji}`);
        const embed = new EmbedBuilder()
          .setTitle(`<a:blue_heart:1414309560231002194> Auto-Reactions`)
          .setDescription(lines.join("\n"))
          .setColor("#00B7FF")
          .setFooter({ text: `Showing ${doc.triggers.length} trigger(s)` });

        return reply({ embeds: [embed], ephemeral: true });
      } else {
        return reply({ content: "❌ Unknown subcommand." });
      }
    } catch (err) {
      console.error("❌ Autoreact command error:", err);
      if (isSlash) {
        if (!interaction.replied) await interaction.reply({ content: "⚠️ Something went wrong.", ephemeral: true }).catch(()=>{});
      } else {
        message.reply("⚠️ Something went wrong.").catch(()=>{});
      }
    }
  }
};
