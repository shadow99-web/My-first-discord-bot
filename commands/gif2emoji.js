const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder
} = require("discord.js");
const fs = require("fs");
const { exec } = require("child_process");
const ffmpeg = require("fluent-ffmpeg");
const path = require("path");

// ✅ Works on all Node 18+ environments
const fetch = global.fetch || ((...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args)));

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
    const query = isInteraction
      ? interaction.options.getString("query")
      : message.content.split(" ").slice(1).join(" ");

    if (!TENOR_KEY)
      return (isInteraction ? interaction.reply : message.reply)(
        "❌ Missing **TENOR_API_KEY** in environment variables."
      );

    if (!query)
      return (isInteraction ? interaction.reply : message.reply)(
        "❌ Please provide a search term."
      );

    if (!guild?.members.me?.permissions.has("ManageGuildExpressions"))
      return (isInteraction ? interaction.reply : message.reply)(
        "❌ I need **Manage Emojis & Stickers** permission."
      );

    // ✅ SAFER reply system
    const safeReply = async (content, opts = {}) => {
      const payload =
        typeof content === "string"
          ? { content, ...opts }
          : { content: "", ...content };

      if (isInteraction) {
        if (interaction.deferred || interaction.replied)
          return interaction.followUp(payload);
        else return interaction.reply(payload);
      } else return message.reply(payload);
    };

    // 🕒 Defer immediately to avoid "Unknown interaction"
    if (isInteraction && !interaction.deferred && !interaction.replied)
      await interaction.deferReply();

    await safeReply(`🔍 Searching Tenor for **${query}**...`);

    // 🎬 Fetch Tenor results
    const res = await fetch(
      `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(
        query
      )}&key=${TENOR_KEY}&limit=5&media_filter=gif`
    );
    const data = await res.json();
    if (!data.results?.length)
      return safeReply(`❌ No GIFs found for "${query}".`);

    const gifs = data.results.map(r => ({
      url: r.media_formats.gif.url,
      title: r.content_description || "Untitled"
    }));

    // 🎨 Select Menu
    const select = new StringSelectMenuBuilder()
      .setCustomId("gif_select")
      .setPlaceholder("Select a GIF to save as emoji")
      .addOptions(
        gifs.map(g => ({
          label: g.title.slice(0, 25),
          value: g.url
        }))
      );

    const row = new ActionRowBuilder().addComponents(select);

    const embed = new EmbedBuilder()
      .setTitle("Select a GIF to save as animated emoji")
      .setDescription(`Query: **${query}**`)
      .setColor("Blurple")
      .setFooter({ text: "Powered by Tenor API" });

    // Replace first reply with menu
    const replyMsg = await interaction.editReply({
      content: "",
      embeds: [embed],
      components: [row]
    });

    // 🕐 Collector
    const collector = replyMsg.createMessageComponentCollector({
      time: 30000,
      max: 1
    });

    collector.on("collect", async i => {
      if (i.user.id !== interaction.user.id)
        return i.reply({ content: "❌ This menu isn’t for you.", flags: 64 }); // ephemeral replacement

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

      // 🧠 Compress
      const compressWithGifsicle = () =>
        new Promise((resolve, reject) => {
          exec(
            `gifsicle --optimize=3 --colors 128 --resize-width 256 "${input}" -o "${output}"`,
            err => (err ? reject(err) : resolve())
          );
        });

      let compressed;
      try {
        await compressWithGifsicle();
        compressed = fs.readFileSync(output);
      } catch {
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
        await i.editReply(
          `❌ Even after compression, file is **${sizeKB.toFixed(
            1
          )} KB**, too large.`
        );
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
  }
};
