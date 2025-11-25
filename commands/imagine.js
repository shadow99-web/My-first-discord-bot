const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const axios = require("axios");

const styles = [
  "realistic", "anime", "cartoon", "cyberpunk", "fantasy", "oil painting",
  "pixel art", "3d render", "watercolor", "sketch", "vaporwave", "cinematic",
  "noir", "sci-fi", "steampunk", "digital painting", "marvel comic",
  "studio ghibli", "gothic"
];

// 🔥 Generate image from Ryzumi (stable)
async function generateImage(prompt) {
  try {
    const res = await axios.post("https://api.ryzumi.io/imagine", {
      prompt,
      model: "flux-schnell", // stable model
      width: 768,
      height: 768,
      safe: false
    });

    return res.data.image;
  } catch (err) {
    console.log("Ryzumi Imagine Error:", err.response?.data || err);
    return null;
  }
}

module.exports = {
  name: "imagine",
  description: "Generate an AI image using stable Ryzumi AI",
  data: new SlashCommandBuilder()
    .setName("imagine")
    .setDescription("Generate an AI image from your prompt")
    .addStringOption(option =>
      option.setName("prompt").setDescription("Describe your image").setRequired(true)
    )
    .addStringOption(option => {
      const builder = option.setName("style").setDescription("Choose a style");
      styles.slice(0, 25).forEach(s => builder.addChoices({ name: s, value: s }));
      return builder;
    }),

  async execute({ client, interaction, message, args, isPrefix }) {
    let prompt, style;

    // Prefix command
    if (isPrefix) {
      if (!args.length) return message.reply("⚠️ Usage: `!imagine <prompt> [style]`");

      prompt = args.join(" ");
      const lastWord = args[args.length - 1].toLowerCase();
      style = styles.includes(lastWord) ? lastWord : "realistic";
    }
    // Slash command
    else {
      prompt = interaction.options.getString("prompt");
      style = interaction.options.getString("style") || "realistic";
      await interaction.deferReply();
    }

    const finalPrompt = `${prompt}, ${style} style`;

    // 🎨 Generate image
    const imageUrl = await generateImage(finalPrompt);

    if (!imageUrl) {
      const errorMsg = "❌ Ryzumi servers are busy or unavailable. Try again!";
      return isPrefix ? message.reply(errorMsg) : interaction.editReply(errorMsg);
    }

    // 📌 Embed
    const embed = new EmbedBuilder()
      .setTitle("<a:lyf_golden_stars:1441468729308479601> AI Image Generated")
      .setDescription(`<a:blue_heart:1414309560231002194> **Prompt:** ${prompt}\n **Style:** ${style}`)
      .setImage(imageUrl)
      .setColor("Aqua")
      .setFooter({ text: "Generated with Ryzumi AI" });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("Open Image")
        .setStyle(ButtonStyle.Link)
        .setURL(imageUrl),
      new ButtonBuilder()
        .setCustomId("delete")
        .setLabel("Delete")
        .setStyle(ButtonStyle.Danger)
    );

    // Send the message
    const reply = isPrefix
      ? await message.reply({ embeds: [embed], components: [row] })
      : await interaction.editReply({ embeds: [embed], components: [row] });

    // Collector
    const collector = reply.createMessageComponentCollector({ time: 60_000 });
    collector.on("collect", async btn => {
      const originalUser = isPrefix ? message.author.id : interaction.user.id;
      if (btn.user.id !== originalUser)
        return btn.reply({ content: "⛔ Not your image!", ephemeral: true });

      if (btn.customId === "delete") {
        await btn.reply({ content: "<a:purple_verified:1439271259190988954> Image deleted!", ephemeral: true });
        await reply.delete().catch(() => {});
      }
    });

    collector.on("end", () => {
      reply.edit({ components: [] }).catch(() => {});
    });
  },
};
