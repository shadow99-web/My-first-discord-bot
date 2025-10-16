const {
  SlashCommandBuilder,
  AttachmentBuilder,
  EmbedBuilder,
} = require("discord.js");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

module.exports = {
  name: "nano-image",
  description: "Generate an image based on Nano Banana style presets.",
  data: new SlashCommandBuilder()
    .setName("nano-image")
    .setDescription("Generate an image based on Nano Banana style presets.")
    .addAttachmentOption(option =>
      option
        .setName("image")
        .setDescription("Upload the reference image")
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName("style")
        .setDescription("Choose the image style prompt")
        .setRequired(true)
        .addChoices(
          { name: "Option 1 — Figure on Desk (ZBrush / BANDAI)", value: 1 },
          { name: "Option 2 — Rhythm Dance Game Scene", value: 2 },
          { name: "Option 3 — 9 Nature Portraits", value: 3 },
          { name: "Option 4 — Cinematic Red Portrait", value: 4 },
        )
    ),

  async execute({ client, interaction, message, args, isPrefix }) {
    let style, imageUrl, fileName;

    const prompts = {
      1: `Create a 1/7 scale commercialized figure of the character in the illustration,
      in a realistic style and environment. Place the figure on a computer desk, using
      a circular transparent acrylic base without text. On the computer screen, show
      the ZBrush modeling process of the figure. Next to it, place a BANDAI toy box
      printed with the original artwork.`,
      
      2: `Make a vibrant rhythm dance game scene with the 3D animated character from
      the image, same outfit and pose. Add neon lights, rhythm game UI (score, combo,
      timer), glossy floor reflections, and cinematic energy.`,
      
      3: `Generate 9 half-length portraits based on the reference image. Each shows a
      different natural theme — forests, oceans, deserts, mountains — vivid, colorful,
      detailed backgrounds.`,
      
      4: `Create a dramatic red cinematic portrait with deep shadows, strong light
      contrast, upward camera angle, and rich crimson background.`
    };

    if (isPrefix) {
      if (args.length < 2)
        return message.reply("⚠️ Usage: `!nano-image <style-number> <image-url>`");
      style = parseInt(args[0]);
      if (!prompts[style]) return message.reply("❌ Invalid style number (1–4).");
      imageUrl = args[1];
      fileName = "nano-result.png";
      await message.channel.sendTyping();
    } else {
      await interaction.deferReply();
      const attachment = interaction.options.getAttachment("image");
      imageUrl = attachment.url;
      style = interaction.options.getInteger("style");
      fileName = "nano-result.png";
    }

    try {
      // Fetch and convert image to base64
      const imgBuffer = await fetch(imageUrl).then(r => r.arrayBuffer());
      const base64 = Buffer.from(imgBuffer).toString("base64");

      // ✅ Gemini 1.5 Flash supports text + image input
      const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent([
        { text: prompts[style] },
        { inlineData: { mimeType: "image/png", data: base64 } },
      ]);

      const imagePart =
        result.response?.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
      if (!imagePart) {
        const msg = "❌ No image could be generated. Try again later.";
        if (isPrefix) return message.reply(msg);
        else return interaction.editReply(msg);
      }

      const imageBuffer = Buffer.from(imagePart.inlineData.data, "base64");
      const file = new AttachmentBuilder(imageBuffer, { name: fileName });

      const embed = new EmbedBuilder()
        .setTitle("🍁 Nano Banana Style Image")
        .setDescription(`**Style ${style} Applied!**`)
        .setColor("Gold")
        .setImage(`attachment://${fileName}`);

      if (isPrefix) {
        await message.reply({ embeds: [embed], files: [file] });
      } else {
        await interaction.editReply({ embeds: [embed], files: [file] });
      }

    } catch (err) {
      console.error("❌ Nano Image Error:", err);
      const msg = "⚠️ Failed to generate image. Please try again later.";
      if (isPrefix) message.reply(msg).catch(() => {});
      else interaction.editReply(msg).catch(() => {});
    }
  },
};
