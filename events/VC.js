const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require("discord.js");
const VoiceChannel = require("../models/vcSchema");

module.exports = async (interaction) => {
  if (!interaction.isButton()) return;
  const id = interaction.customId;
  const vcData = await VoiceChannel.findOne({ guildId: interaction.guild.id, userId: interaction.user.id });
  if (!vcData) return interaction.reply({ content: "❌ You don’t own a VC.", ephemeral: true });

  const channel = interaction.guild.channels.cache.get(vcData.channelId);
  if (!channel) return interaction.reply({ content: "❌ Channel not found!", ephemeral: true });

  switch (id) {
    case "lock_vc":
      await channel.permissionOverwrites.edit(interaction.guild.id, { Connect: false });
      return interaction.reply({ content: "🔒 Channel locked!", ephemeral: true });

    case "unlock_vc":
      await channel.permissionOverwrites.edit(interaction.guild.id, { Connect: true });
      return interaction.reply({ content: "🔓 Channel unlocked!", ephemeral: true });

    case "rename_vc": {
      const modal = new ModalBuilder()
        .setCustomId("renameModal")
        .setTitle("Rename Your VC")
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("vcName")
              .setLabel("Enter new VC name")
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
          )
        );
      await interaction.showModal(modal);
      break;
    }

    case "limit_vc": {
      const modal = new ModalBuilder()
        .setCustomId("limitModal")
        .setTitle("Set User Limit")
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("vcLimit")
              .setLabel("Enter max user limit (1–99)")
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
          )
        );
      await interaction.showModal(modal);
      break;
    }

    case "delete_vc":
      await channel.delete().catch(() => {});
      await VoiceChannel.deleteOne({ _id: vcData._id });
      return interaction.reply({ content: "💥 Your VC has been deleted.", ephemeral: true });
  }
};

// Modal submissions
module.exports.modalHandler = async (interaction) => {
  if (!interaction.isModalSubmit()) return;
  const vcData = await VoiceChannel.findOne({ guildId: interaction.guild.id, userId: interaction.user.id });
  if (!vcData) return;

  const channel = interaction.guild.channels.cache.get(vcData.channelId);
  if (!channel) return;

  if (interaction.customId === "renameModal") {
    const newName = interaction.fields.getTextInputValue("vcName");
    await channel.setName(newName);
    return interaction.reply({ content: `🔵 Renamed VC to **${newName}**`, ephemeral: true });
  }

  if (interaction.customId === "limitModal") {
    const limit = parseInt(interaction.fields.getTextInputValue("vcLimit"));
    if (isNaN(limit) || limit < 1 || limit > 99)
      return interaction.reply({ content: "❌ Invalid limit!", ephemeral: true });

    await channel.setUserLimit(limit);
    return interaction.reply({ content: `👥 Set user limit to **${limit}**`, ephemeral: true });
  }
};
