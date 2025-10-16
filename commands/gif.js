Const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const axios = require("axios");

// NOTE: You must set TENOR_CLIENT_KEY in your environment variables for Tenor API V2 compliance.
// The client_key is a unique identifier for your application (e.g., "my_discord_bot").
// It should be registered with your Tenor API key in the Google Cloud Console.

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
      const tenorClientKey = process.env.TENOR_CLIENT_KEY; // Recommended for Tenor V2
      
      if (!tenorKey) {
        const msg = "❌ TENOR_API_KEY not set.";
        return isPrefix ? message.reply(msg) : interaction.editReply(msg);
      }
      
      // Check for client key as well, as it's strongly recommended for V2
      if (!tenorClientKey) {
          const msg = "❌ TENOR_CLIENT_KEY not set. This is required for Tenor V2 API.";
          return isPrefix ? message.reply(msg) : interaction.editReply(msg);
      }

      const limit = 10;
      // Added client_key and media_filter for explicit format request (best practice)
      const url = `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(query)}&key=${tenorKey}&client_key=${tenorClientKey}&limit=${limit}&media_filter=gif`;

      const resp = await axios.get(url);
      const results = resp.data.results;

      if (!results || results.length === 0) {
        const msg = `⚠️ No GIFs found for **${query}**`;
        return isPrefix ? message.reply(msg) : interaction.editReply(msg);
      }

      let index = 0;

      const getEmbed = () => {
        // Use optional chaining for safety, though 'gif' should exist if media_filter=gif was used
        const media = results[index].media_formats?.gif?.url; 
        
        if (!media) {
             console.warn(`GIF URL not found for result ${index + 1}`);
             // Fallback or error handling for missing URL if needed, but we'll proceed assuming it's available
        }

        return new EmbedBuilder()
          .setTitle(`🐼 Gif result: ${query}`)
          .setImage(media || 'https://i.imgur.com/GfJ3J9H.png') // Fallback image if media is somehow missing
          .setFooter({ text: `Result ${index + 1}/${results.length} | Powered by Tenor` })
          .setColor("Aqua");
      };

      const getButtons = () => {
        // Disable buttons at the start/end if you want, but circular iteration is fine too.
        return new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("prev").setLabel("◀️").setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId("next").setLabel("▶️").setStyle(ButtonStyle.Secondary)
        );
      }

      // Determine the reference for the reply/editReply
      const replyTarget = isPrefix ? message : interaction;

      const sent = await replyTarget.reply({ 
          embeds: [getEmbed()], 
          components: [getButtons()],
          // Ensure ephemeral is false for message.reply and interaction.editReply
          fetchReply: true 
      });

      // The collector needs the message object, which sent now is (due to fetchReply: true)
      const collector = sent.createMessageComponentCollector({ time: 60_000 });

      collector.on("collect", async (btn) => {
        // Use sent.author.id for prefix commands and interaction.user.id for slash commands for more robustness
        const authorId = isPrefix ? message.author.id : interaction.user.id;
        
        if (btn.user.id !== authorId) {
          return btn.reply({ content: "⛔ That button isn't for you!", ephemeral: true });
        }
        
        // Circular logic remains correct
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
      // Use the correct reply mechanism based on the command type
      if (isPrefix) message.reply(msg).catch(() => {});
      else interaction.editReply(msg).catch(() => {});
    }
  },
};
