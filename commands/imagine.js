const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

const styles = [
  "realistic",
  "anime",
  "cartoon",
  "cyberpunk",
  "fantasy",
  "oil painting",
  "pixel art",
  "3d render",
  "watercolor",
  "sketch",
  "vaporwave",
  "cinematic",
  "noir",
  "sci-fi",
  "steampunk",
  "digital painting",
  "marvel comic",
  "studio ghibli",
  "gothic",
];

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

    if (isPrefix) {
      if (!args.length)
        return message.reply("⚠️ Usage: `!imagine <prompt> [style]`");

      prompt = args.join(" ");
      const lastWord = args[args.length - 1].toLowerCase();
      style = styles.includes(lastWord) ? lastWord : "realistic";
    } else {
      prompt = interaction.options.getString("prompt");
      style = interaction.options.getString("style") || "realistic";
      await interaction.deferReply();
    }

    const finalPrompt = `${prompt}, ${style} style`;
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(finalPrompt)}`;

    const embed = new EmbedBuilder()
      .setTitle("♥ AI-Generated Image")
      .setDescription(`🤞🏻 **Prompt:** ${prompt}\n✨ **Style:** ${style}`)
      .setImage(imageUrl)
      .setColor("Aqua")
      .setFooter({ text: "Generated with Pollinations AI" });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("✔️ Open Image")
        .setStyle(ButtonStyle.Link)
        .setURL(imageUrl),
      new ButtonBuilder()
        .setCustomId("delete")
        .setLabel("⚡ Delete")
        .setStyle(ButtonStyle.Danger)
    );

    const reply =
      isPrefix
        ? await message.reply({ embeds: [embed], components: [row] })
        : await interaction.editReply({ embeds: [embed], components: [row] });

    const collector = reply.createMessageComponentCollector({ time: 60_000 });
    collector.on("collect", async btn => {
      if (btn.user.id !== (isPrefix ? message.author.id : interaction.user.id))
        return btn.reply({ content: "⛔ Not your image!", ephemeral: true });

      if (btn.customId === "delete") {
        await btn.reply({ content: "⚡ Image deleted!", ephemeral: true });
        await reply.delete().catch(() => {});
      }
    });

    collector.on("end", () => {
      reply.edit({ components: [] }).catch(() => {});
    });
  },
};
