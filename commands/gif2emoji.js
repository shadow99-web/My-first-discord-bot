const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require("discord.js");
const fs = require("fs");
const { exec } = require("child_process");
const ffmpeg = require("fluent-ffmpeg");
const path = require("path");

// ✅ Works on all Node 18+ environments (Render, Replit, etc.)
const fetch = global.fetch || ((...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args)));

// ✅ Load Tenor API key (REQUIRED)
const TENOR_KEY = process.env.TENOR_API_KEY || process.env.TENOR_CLIENT_KEY;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("gif2emoji")
    .setDescription("Search Tenor GIFs and save one as an animated emoji")
    .addStringOption(opt =>
      opt.setName("query").setDescription("Search term").setRequired(true)
    ),

  name: "gif2emoji",
  aliases: ["g2e", "gifemoji"],

  async execute({ interaction, message, client }) {
    const isInteraction = !!interaction;
    const guild = isInteraction ? interaction.guild : message.guild;
    const query = isInteraction ? interaction.options.getString("query") : message.content.split(" ").slice(1).join(" ");

    // 🧩 Check Tenor key
    if (!TENOR_KEY) {
      return (isInteraction ? interaction.reply : message.reply)(
        "❌ Missing **TENOR_API_KEY** in environment variables."
      );
    }

    if (!query) {
      return (isInteraction ? interaction.reply : message.reply)(
        "❌ Please provide a search term."
      );
    }

    if (!guild?.members.me?.permissions.has("ManageGuildExpressions")) {
      return (isInteraction ? interaction.reply : message.reply)(
        "❌ I need **Manage Emojis & Stickers** permission."
      );
    }

    const replyFn = async (content, opts = {}) => {
      if (isInteraction) return interaction.reply({ content, ...opts });
      else return message.reply({ content, ...opts });
    };

    await replyFn(`🔍 Searching Tenor for **${query}**...`);

    // 🧠 Fetch from Tenor
    const res = await fetch(`https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(query)}&key=${TENOR_KEY}&limit=5&media_filter=gif`);
    const data = await res.json();

    if (!data.results?.length) return replyFn(`❌ No GIFs found for "${query}".`);

    const gifs = data.results.map(r => ({
      url: r.media_formats.gif.url,
      title: r.content_description || "Untitled",
    }));

    // 🎨 Build menu
    const select = new StringSelectMenuBuilder()
      .setCustomId("gif_select")
      .setPlaceholder("Select a GIF to save as emoji")
      .addOptions(gifs.map((g, i) => ({
        label: g.title.slice(0, 25),
        value: g.url,
      })));

    const row = new ActionRowBuilder().addComponents(select);

    const embed = new EmbedBuilder()
      .setTitle("Select a GIF to save as animated emoji")
      .setDescription(`Query: **${query}**`)
      .setColor("Blurple")
      .setFooter({ text: "Powered by Tenor API" });

    const reply = await replyFn({ embeds: [embed], components: [row] });

    // 🕐 Wait for user selection
    const collector = reply.createMessageComponentCollector({ time: 30000, max: 1 });

    collector.on("collect", async (i) => {
      if (i.user.id !== (isInteraction ? interaction.user.id : message.author.id))
        return i.reply({ content: "❌ This menu isn’t for you.", ephemeral: true });

      await i.deferReply();

      const gifUrl = i.values[0];
      const name = query.replace(/\s+/g, "_").toLowerCase();
      const tempDir = path.join(__dirname, "../../temp");

      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

      const input = path.join(tempDir, `${name}.gif`);
      const output = path.join(tempDir, `${name}_compressed.gif`);

      const response = await fetch(gifUrl);
      const buffer = Buffer.from(await response.arrayBuffer());
      fs.writeFileSync(input, buffer);

      // 🧠 Step 1: Try gifsicle compression
      const compressWithGifsicle = () => new Promise((resolve, reject) => {
        exec(`gifsicle --optimize=3 --colors 128 --resize-width 256 "${input}" -o "${output}"`, (err) => {
          if (err) return reject(err);
          resolve();
        });
      });

      let compressed;
      try {
        await compressWithGifsicle();
        compressed = fs.readFileSync(output);
      } catch (e) {
        // 🎞️ fallback: ffmpeg
        await new Promise((resolve, reject) => {
          ffmpeg(input)
            .outputOptions(["-vf", "scale=256:-1:flags=lanczos,fps=15"])
            .save(output)
            .on("end", resolve)
            .on("error", reject);
        });
        compressed = fs.readFileSync(output);
      }

      const sizeKB = compressed.length / 1024;

      if (sizeKB > 256) {
        await i.editReply(`❌ Even after compression, file size is **${sizeKB.toFixed(1)} KB**, too large to upload.`);
        fs.unlinkSync(input);
        fs.unlinkSync(output);
        return;
      }

      try {
        const emoji = await guild.emojis.create({ attachment: compressed, name });
        await i.editReply(`✅ Uploaded as animated emoji: ${emoji.toString()}`);
      } catch (err) {
        console.error(err);
        await i.editReply(`❌ Failed to upload emoji: ${err.message}`);
      }

      fs.unlinkSync(input);
      fs.unlinkSync(output);
    });
  },
};
