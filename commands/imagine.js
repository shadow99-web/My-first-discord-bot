const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const axios = require("axios");

const styles = [
  "realistic", "anime", "cartoon", "cyberpunk", "fantasy",
  "oil painting", "pixel art", "3d render", "watercolor",
  "sketch", "vaporwave", "cinematic", "noir", "sci-fi",
  "steampunk", "digital painting", "marvel comic",
  "studio ghibli", "gothic"
];

// ⭐ MAIN POLLINATIONS IMAGE GENERATOR
async function generatePollinations(prompt) {
  try {
    const encoded = encodeURIComponent(prompt);
    const url = `https://image.pollinations.ai/prompt/${encoded}`;
    // Pollinations does not require axios request — it directly sends image
    return url;
  } catch (err) {
    return null;
  }
}

// ⭐ FALLBACK GENERATOR (always works)
async function fallbackGenerator(prompt) {
  return `https://dummyimage.com/768x768/000/fff.png&text=${encodeURIComponent(
    prompt
  )}`;
}

module.exports = {
  name: "imagine",
  description: "Generate an AI image using Pollinations AI",
  data: new SlashCommandBuilder()
    .setName("imagine")
    .setDescription("Generate an AI image from your prompt")
    .addStringOption(option =>
      option.setName("prompt").setDescription("Describe the image").setRequired(true)
    )
    .addStringOption(option => {
      const builder = option.setName("style").setDescription("Choose a style");
      styles.slice(0, 25).forEach(s => builder.addChoices({ name: s, value: s }));
      return builder;
    }),

  async execute({ client, interaction, message, args, isPrefix }) {
    let prompt, style;

    // PREFIX MODE
    if (isPrefix) {
      if (!args.length)
        return message.reply("⚠️ Usage: `!imagine <prompt> [style]`");

      prompt = args.join(" ");
      const lastWord = args[args.length - 1].toLowerCase();
      style = styles.includes(lastWord) ? lastWord : "realistic";
    }
    // SLASH MODE
    else {
      prompt = interaction.options.getString("prompt");
      style = interaction.options.getString("style") || "realistic";
      await interaction.deferReply();
    }

    const finalPrompt = `${prompt}, ${style} style`;

    // Try Pollinations first
    let imageUrl = await generatePollinations(finalPrompt);

    // ❌ Pollinations error → auto fallback
    if (!imageUrl) {
      imageUrl = await fallbackGenerator(finalPrompt);
    }

    // 📌 Embed
    const embed = new EmbedBuilder()
      .setTitle("<a:blue_heart:1414309560231002194> AI Image Generated")
      .setDescription(`<a:lyf_golden_stars:1441468729308479601> **Prompt:** ${prompt}\n<a:blue_heart:1414309560231002194> **Style:** ${style}`)
      .setImage(imageUrl)
      .setColor("Aqua")
      .setFooter({
        text: client.user.username,
        iconURL: client.user.displayAvatarURL(),
      });

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

    const reply = isPrefix
      ? await message.reply({ embeds: [embed], components: [row] })
      : await interaction.editReply({ embeds: [embed], components: [row] });

    const collector = reply.createMessageComponentCollector({ time: 60000 });
    collector.on("collect", async btn => {
      const originalUser = isPrefix ? message.author.id : interaction.user.id;
      if (btn.user.id !== originalUser)
        return btn.reply({ content: "⛔ Not your image!", ephemeral: true });

      if (btn.customId === "delete") {
        await btn.reply({ content: "<a:purple_verified:1439271259190988954> Image deleted!", ephemeral: true });
        await reply.delete().catch(() => {});
      }
    });

    collector.on("end", () => reply.edit({ components: [] }).catch(() => {}));
  },
};
