const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
} = require("discord.js");
const discordTranscripts = require("discord-html-transcripts");
const fs = require("fs-extra");
const axios = require("axios");
const FormData = require("form-data");

module.exports = {
  name: "transcriptall",
  description: "📜 Generate HTML transcripts for all text channels in the server.",
  usage: "transcriptall [withImages|noImages]",

  data: new SlashCommandBuilder()
    .setName("transcriptall")
    .setDescription("Generate HTML transcripts for all text channels.")
    .addStringOption(option =>
      option.setName("images")
        .setDescription("Include images in transcripts? (yes/no)")
        .setRequired(false)
        .addChoices(
          { name: "Yes (Include Images)", value: "yes" },
          { name: "No (Faster, No Images)", value: "no" }
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interactionOrMessage, client) {
    const isSlash = !!interactionOrMessage.isChatInputCommand;
    const interaction = isSlash ? interactionOrMessage : null;
    const message = isSlash ? null : interactionOrMessage;

    try {
      const guild = isSlash ? interaction.guild : message.guild;
      const user = isSlash ? interaction.user : message.author;

      const includeImages = isSlash
        ? interaction.options?.getString("images") || "yes"
        : (message.content.includes("noImages") ? "no" : "yes");

      const withImages = includeImages === "yes";

      const textChannels = guild.channels.cache.filter(c => c.isTextBased() && c.viewable);
      if (!textChannels.size)
        return isSlash
          ? interaction.reply({ content: "❌ No text channels found!", ephemeral: true })
          : message.reply("❌ No text channels found!");

      const progressMsg = isSlash
        ? await interaction.reply({ content: `🕓 Generating transcripts for **${textChannels.size}** channels... [░░░░░░░░░░] 0%`, fetchReply: true })
        : await message.reply(`🕓 Generating transcripts for **${textChannels.size}** channels... [░░░░░░░░░░] 0%`);

      const folder = `./transcripts_all_${guild.id}`;
      await fs.ensureDir(folder);

      let completed = 0;
      const updateProgress = async () => {
        const percent = Math.round((completed / textChannels.size) * 100);
        const filled = Math.round(percent / 10);
        const bar = "█".repeat(filled) + "░".repeat(10 - filled);
        const msg = `🕓 Generating transcripts... [${bar}] ${percent}% (${completed}/${textChannels.size})`;
        if (isSlash) await interaction.editReply(msg);
        else await progressMsg.edit(msg);
      };

      const transcriptFiles = [];

      for (const channel of textChannels.values()) {
        try {
          const fileName = `${channel.name.replace(/[^a-zA-Z0-9]/g, "_")}.html`;
          const filePath = `${folder}/${fileName}`;

          const transcript = await discordTranscripts.createTranscript(channel, {
            limit: -1,
            returnType: "buffer",
            fileName,
            saveImages: withImages,
            footerText: `Generated from ${guild.name}`,
            poweredBy: false,
          });

          await fs.writeFile(filePath, transcript);
          transcriptFiles.push(filePath);
        } catch (err) {
          console.log(`⚠️ Failed transcript for ${channel.name}:`, err.message);
        }

        completed++;
        await updateProgress();
      }

      if (!transcriptFiles.length)
        return isSlash
          ? interaction.editReply("⚠️ No transcripts could be created!")
          : progressMsg.edit("⚠️ No transcripts could be created!");

      // Zip everything
      const zipPath = `./${guild.name.replace(/[^a-zA-Z0-9]/g, "_")}_transcripts.zip`;
      const archiver = require("archiver");
      const output = fs.createWriteStream(zipPath);
      const archive = archiver("zip", { zlib: { level: 9 } });

      archive.pipe(output);
      for (const file of transcriptFiles) archive.file(file, { name: file.split("/").pop() });
      await archive.finalize();

      await updateProgress();

      // Upload to bashupload.com
      const form = new FormData();
      form.append("file", fs.createReadStream(zipPath));
      const upload = await axios.post("https://bashupload.com/", form, {
        headers: form.getHeaders(),
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });

      const link = upload.data.match(/https?:\/\/bashupload\.com\/[^\s]+/g)?.[0] || null;

      const embed = new EmbedBuilder()
        .setColor("Aqua")
        .setTitle("📜 Server Transcripts Ready")
        .setDescription(link
          ? `✅ All transcripts generated successfully!\n📁 [Click to download transcripts](${link})`
          : "✅ All transcripts generated successfully! (See attached ZIP file)")
        .setFooter({ text: `Requested by ${user.tag}` })
        .setTimestamp();

      if (link) {
        isSlash
          ? await interaction.editReply({ content: "", embeds: [embed] })
          : await progressMsg.edit({ content: "", embeds: [embed] });
      } else {
        const attachment = new AttachmentBuilder(zipPath);
        isSlash
          ? await interaction.editReply({ embeds: [embed], files: [attachment] })
          : await progressMsg.edit({ embeds: [embed], files: [attachment] });
      }

      // Cleanup
      setTimeout(() => {
        fs.remove(folder).catch(() => {});
        fs.unlink(zipPath).catch(() => {});
      }, 60000);

    } catch (error) {
      console.error("TranscriptAll Error:", error);
      const msg = "❌ Failed to generate transcripts. Try again later.";
      if (isSlash) {
        if (interaction.deferred) await interaction.editReply(msg);
        else await interaction.reply({ content: msg, ephemeral: true });
      } else message.reply(msg);
    }
  },
};
