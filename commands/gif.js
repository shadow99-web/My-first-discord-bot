const { // <-- FIX 1: 'Const' must be lowercase 'const'
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const axios = require("axios");

// NOTE: You must set TENOR_CLIENT_KEY in your environment variables for Tenor API V2 compliance.

module.exports = {
  name: "gif",
  description: "Search for a GIF using Tenor",
  data: new SlashCommandBuilder()
    .setName("gif")
    .setDescription("Search for a GIF via Tenor")
    .addStringOption(option =>
      option
        .setName("query")
        .setDescription("What GIF do you want?")
        .setRequired(true)
    ),

  async execute({ client, interaction, message, args, isPrefix }) {
    let query;
    if (isPrefix) {
      if (!args.length) return message.reply("⚠️ Usage: `!gif <search term>`");
      query = args.join(" ");
    } else {
      query = interaction.options.getString("query");
      // Defer only for slash commands
      await interaction.deferReply();
    }

    try {
      const tenorKey = process.env.TENOR_API_KEY;
      const tenorClientKey = process.env.TENOR_CLIENT_KEY; 
      
      if (!tenorKey) {
        const msg = "❌ TENOR_API_KEY not set.";
        // For non-deferred error replies on slash commands, you can still use reply(ephemeral: true) or editReply() if deferred
        return isPrefix ? message.reply(msg) : interaction.editReply(msg); 
      }
      
      if (!tenorClientKey) {
          const msg = "❌ TENOR_CLIENT_KEY not set. This is required for Tenor V2 API.";
          return isPrefix ? message.reply(msg) : interaction.editReply(msg);
      }

      const limit = 10;
      const url = `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(query)}&key=${tenorKey}&client_key=${tenorClientKey}&limit=${limit}&media_filter=gif`;

      const resp = await axios.get(url);
      const results = resp.data.results;

      if (!results || results.length === 0) {
        const msg = `⚠️ No GIFs found for **${query}**`;
        // Use editReply for slash commands since it was deferred earlier
        return isPrefix ? message.reply(msg) : interaction.editReply(msg);
      }

      let index = 0;

      const getEmbed = () => {
        const media = results[index].media_formats?.gif?.url; 
        
        if (!media) {
             console.warn(`GIF URL not found for result ${index + 1}`);
        }

        return new EmbedBuilder()
          .setTitle(`🐼 Gif result: ${query}`)
          .setImage(media || 'https://i.imgur.com/GfJ3J9H.png') 
          .setFooter({ text: `Result ${index + 1}/${results.length} | Powered by Tenor` })
          .setColor("Aqua");
      };

      const getButtons = () => {
        return new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("prev").setLabel("◀️").setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId("next").setLabel("▶️").setStyle(ButtonStyle.Secondary)
        );
      }

      // --- FIX 2: Correctly use reply/editReply based on command type ---
      let sent;
      const replyOptions = { 
          embeds: [getEmbed()], 
          components: [getButtons()],
          fetchReply: true 
      };

      if (isPrefix) {
          // Use reply() for prefix commands
          sent = await message.reply(replyOptions);
      } else {
          // Use editReply() for slash commands (since deferReply was called)
          sent = await interaction.editReply(replyOptions);
      }
      // --- END FIX 2 ---

      // The collector needs the message object
      const collector = sent.createMessageComponentCollector({ time: 60_000 });

      collector.on("collect", async (btn) => {
        const authorId = isPrefix ? message.author.id : interaction.user.id;
        
        if (btn.user.id !== authorId) {
          return btn.reply({ content: "⛔ That button isn't for you!", ephemeral: true });
        }
        
        if (btn.customId === "next") {
          index = (index + 1) % results.length;
        } else if (btn.customId === "prev") {
          index = (index - 1 + results.length) % results.length;
        }
        await btn.update({ embeds: [getEmbed()], components: [getButtons()] });
      });

      collector.on("end", () => {
        // Disable buttons after timeout
        sent.edit({ components: [] }).catch(() => {});
      });
    } catch (err) {
      console.error("gif command error:", err);
      const msg = "❌ Failed to fetch GIF. Try again later.";
      
      // Use the correct error reply mechanism
      if (isPrefix) message.reply(msg).catch(() => {});
      // interaction.editReply is safest here since it was deferred
      else interaction.editReply(msg).catch(() => {});
    }
  },
};
