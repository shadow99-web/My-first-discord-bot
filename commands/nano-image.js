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

    // 🖼 Style Prompts
    const prompts = {
      1: `Create a 1/7 scale commercialized figure of the character in the illustration, in a realistic style and environment.
      Place the figure on a computer desk, using a circular transparent acrylic base without any text.
      On the computer screen, display the ZBrush modeling process of the figure.
      Next to the computer screen, place a BANDAI-style toy packaging box printed with the original artwork.`,

      2: `A vibrant rhythm dance game screenshot featuring the 3D animated character from the reference photo, keeping its unique style, hat, outfit, and confident dance pose.
      Immersive cinematic lighting with neon pink and purple glow, glossy reflective dance floor shining under spotlights, and dynamic 3D cartoon style.
      Rhythm game interface with immersive UI: score meter at the top, colorful music waveform animations synced to the beat, stage timer countdown, and floating combo numbers.
      Highly detailed, game-like atmosphere with energy bars, neon particle effects, and immersive arcade rhythm game HUD elements. Ultra-detailed, cinematic, immersive, 3D animation.`,

      3: `Using the uploaded photo as a reference, generate a set of 9 vibrant half-length portraits featuring natural life.
      Each portrait should show a different pose and be placed in a unique setting, with rich, colorful details that highlight the diversity of nature.`,

      4: `Create a vertical portrait shot using the exact same face features, characterized by stark cinematic lighting and intense contrast.
      Captured in a slightly low, upward-facing angle that dramatizes the subject’s jawline and neck.
      The background is a deep, saturated crimson red, creating a bold visual clash with the model’s luminous skin and dark wardrobe.`,
    };

    // ⚙️ Detect if prefix or slash
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
      // 🔄 Convert uploaded image to base64
      const imageArrayBuffer = await fetch(imageUrl).then(r => r.arrayBuffer());
      const imageBase64 = Buffer.from(imageArrayBuffer).toString("base64");

      // ✨ Correct Image Generation Model
      const model = ai.getGenerativeModel({ model: "gemini-2.5-flash-image" });

      // 🧩 Generate content (prompt + input image)
      const result = await model.generateContent([
        { text: prompts[style] },
        { inlineData: { mimeType: "image/png", data: imageBase64 } },
      ]);

      // 🖼 Extract generated image
      const imagePart =
        result.response?.candidates?.[0]?.content?.parts?.find(p => p.inlineData);

      if (!imagePart) {
        const msg = "❌ No image could be generated. Try again later.";
        if (isPrefix) return message.reply(msg);
        else return interaction.editReply(msg);
      }

      const buffer = Buffer.from(imagePart.inlineData.data, "base64");
      const file = new AttachmentBuilder(buffer, { name: fileName });

      const embed = new EmbedBuilder()
        .setTitle("🍌 Nano Banana Style Image")
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
