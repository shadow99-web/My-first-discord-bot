// commands/do.js
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const axios = require("axios");

const actions = [
  "hug", "kiss", "slap", "pat", "poke", "cuddle", "bite", "highfive", "wave",
  "dance", "blush", "cry", "smile", "laugh", "wink", "angry", "sleep", "facepalm",
  "tickle", "handshake", "bow", "stare", "bonk", "yeet"
];

module.exports = {
  name: "do",
  description: "Perform an action like hug, slap, pat, etc. with a user — includes anime GIFs ",
  data: new SlashCommandBuilder()
    .setName("do")
    .setDescription("Perform a fun anime-style action with another user!")
    .addStringOption(option =>
      option
        .setName("action")
        .setDescription("Choose an action")
        .setRequired(true)
        .addChoices(...actions.map(a => ({ name: a, value: a })))
    )
    .addUserOption(option =>
      option
        .setName("target")
        .setDescription("Mention someone to do the action with")
        .setRequired(false)
    ),

  async execute({ client, interaction, message, args, isPrefix }) {
    const tenorKey = process.env.TENOR_API_KEY;
    const tenorClientKey = process.env.TENOR_CLIENT_KEY;

    if (!tenorKey || !tenorClientKey) {
      const missing = !tenorKey ? "TENOR_API_KEY" : "TENOR_CLIENT_KEY";
      const msg = `❌ ${missing} not set in environment variables.`;
      if (isPrefix) return message.reply(msg);
      return interaction.reply({ content: msg, ephemeral: true });
    }

    let action, target;

    if (isPrefix) {
      if (!args.length) {
        return message.reply(`⚠️ Usage: \`!do <${actions.join("/")}> [@user]\``);
      }
      action = args[0].toLowerCase();
      if (!actions.includes(action))
        return message.reply(`❌ Invalid action! Try one of: ${actions.join(", ")}`);
      target = message.mentions.users.first();
    } else {
      action = interaction.options.getString("action");
      target = interaction.options.getUser("target");
      await interaction.deferReply();
    }

    const author = isPrefix ? message.author : interaction.user;
    const targetName = target ? `<@${target.id}>` : "themselves 😅";

    const query = `${action} anime`;

    try {
      const url = `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(query)}&key=${tenorKey}&client_key=${tenorClientKey}&limit=20&media_filter=gif`;
      const res = await axios.get(url, { timeout: 10000 });
      const results = res.data?.results || [];

      if (!results.length) {
        const msg = `⚠️ No GIF found for **${action}**!`;
        return isPrefix ? message.reply(msg) : interaction.editReply(msg);
      }

      const chosen = results[Math.floor(Math.random() * results.length)];
      const gifUrl = chosen?.media_formats?.gif?.url;

      const embed = new EmbedBuilder()
        .setTitle(`✨ ${action.toUpperCase()}!`)
        .setDescription(`**${author.username}** ${action}s ${targetName}!`)
        .setImage(gifUrl)
        .setColor("Random")
        .setFooter({ text: "♡ SHADOW" });

      if (isPrefix) {
        await message.reply({ embeds: [embed] });
      } else {
        await interaction.editReply({ embeds: [embed] });
      }
    } catch (err) {
      console.error("❌ Error fetching Tenor gif:", err);
      const errMsg = "⚠️ Failed to fetch GIF. Please try again later.";
      if (isPrefix) message.reply(errMsg).catch(() => {});
      else interaction.editReply(errMsg).catch(() => {});
    }
  },
};
