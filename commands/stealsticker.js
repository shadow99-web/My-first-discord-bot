const { SlashCommandBuilder, AttachmentBuilder } = require("discord.js");

module.exports = {
  name: "stealsticker",

  data: new SlashCommandBuilder()
    .setName("stealsticker")
    .setDescription("Steal a sticker and add it to your server")
    .addAttachmentOption((opt) =>
      opt.setName("file").setDescription("Upload a sticker").setRequired(false)
    ),

  async execute({ interaction, message, args, isPrefix }) {
    let stickerUrl;
    let stickerName = "sticker";

    // ======================
    // PREFIX COMMAND
    // ======================
    if (isPrefix) {
      if (!message.stickers.first())
        return message.reply("❌ No sticker found.");

      const s = message.stickers.first();
      stickerUrl = s.url;
      stickerName = s.name;
    }

    // ======================
    // SLASH COMMAND
    // ======================
    else {
      const attachment = interaction.options.getAttachment("file");

      if (!attachment && interaction.message?.stickers?.first()) {
        // If user tries using context + slash
        stickerUrl = interaction.message.stickers.first().url;
        stickerName = interaction.message.stickers.first().name;
      } else if (attachment) {
        stickerUrl = attachment.url;
        stickerName = attachment.name.split(".")[0];
      } else {
        return interaction.reply({
          content: "❌ No sticker provided.",
          ephemeral: true,
        });
      }

      await interaction.deferReply();
    }

    try {
      const guild = isPrefix ? message.guild : interaction.guild;

      if (!guild.members.me.permissions.has("ManageGuildExpressions"))
        return isPrefix
          ? message.reply("❌ I need **Manage Guild Expressions** permission!")
          : interaction.editReply("❌ I need **Manage Guild Expressions** permission!");

      const res = await guild.stickers.create({
        file: stickerUrl,
        name: stickerName,
        tags: "🙂",
      });

      return isPrefix
        ? message.reply(`<a:purple_verified:1439271259190988954> Added sticker: ${res.name}`)
        : interaction.editReply(`<a:purple_verified:1439271259190988954> Added sticker: ${res.name}`);
    } catch (err) {
      console.error(err);
      return isPrefix
        ? message.reply("❌ Failed to add sticker.")
        : interaction.editReply("❌ Failed to add sticker.");
    }
  },
};
