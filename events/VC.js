// events/VC.js
const {
  EmbedBuilder,
  ChannelType,
  PermissionFlagsBits,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} = require("discord.js");
const VoiceChannel = require("../models/vcSchema");

module.exports = async (client) => {
  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isButton()) return;
    const { customId, guild, member } = interaction;

    // Only handle vc buttons
    if (!customId.startsWith("vc_")) return;

    const [ , action, channelId ] = customId.split("_");
    const channel = guild.channels.cache.get(channelId);
    const vcData = await VoiceChannel.findOne({ guildId: guild.id, userId: member.id });

    // Validate ownership
    if (!vcData || vcData.channelId !== channelId) {
      return interaction.reply({
        content: "❌ You don’t own this VC!",
        ephemeral: true,
      });
    }

    try {
      switch (action) {
        // 🔒 LOCK VC
        case "lock": {
          await channel.permissionOverwrites.edit(guild.id, {
            Connect: false,
          });
          return interaction.reply({
            content: "🔒 **Locked** your voice channel.",
            ephemeral: true,
          });
        }

        // 🔓 UNLOCK VC
        case "unlock": {
          await channel.permissionOverwrites.edit(guild.id, {
            Connect: true,
          });
          return interaction.reply({
            content: "🔓 **Unlocked** your voice channel.",
            ephemeral: true,
          });
        }

        // 🔵 RENAME VC
        case "rename": {
          const modal = new ModalBuilder()
            .setCustomId(`rename_modal_${channelId}`)
            .setTitle("🔵 Rename Voice Channel");

          const input = new TextInputBuilder()
            .setCustomId("new_name")
            .setLabel("Enter new VC name")
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setPlaceholder(`${member.user.username}'s VC`);

          modal.addComponents(new ActionRowBuilder().addComponents(input));
          return interaction.showModal(modal);
        }

        // 👥 LIMIT VC
        case "limit": {
          const modal = new ModalBuilder()
            .setCustomId(`limit_modal_${channelId}`)
            .setTitle("👥 Set User Limit");

          const input = new TextInputBuilder()
            .setCustomId("new_limit")
            .setLabel("Enter user limit (0 = unlimited)")
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setPlaceholder("0-99");

          modal.addComponents(new ActionRowBuilder().addComponents(input));
          return interaction.showModal(modal);
        }

        // ✖️ DELETE VC
        case "delete": {
          if (channel) await channel.delete().catch(() => {});
          await VoiceChannel.deleteOne({ guildId: guild.id, userId: member.id });

          return interaction.reply({
            content: "✖️ Deleted your personal voice channel.",
            ephemeral: true,
          });
        }
      }
    } catch (err) {
      console.error("❌ VC button error:", err);
      return interaction.reply({
        content: "⚠️ Something went wrong handling this button.",
        ephemeral: true,
      });
    }
  });

  // ==========================
  // Handle MODALS
  // ==========================
  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isModalSubmit()) return;
    const { customId, guild, member } = interaction;

    // RENAME
    if (customId.startsWith("rename_modal_")) {
      const channelId = customId.split("_")[2];
      const channel = guild.channels.cache.get(channelId);
      const vcData = await VoiceChannel.findOne({ guildId: guild.id, userId: member.id });

      if (!vcData || vcData.channelId !== channelId)
        return interaction.reply({ content: "❌ You don’t own this VC.", ephemeral: true });

      const newName = interaction.fields.getTextInputValue("new_name").trim();
      if (!newName.length) return interaction.reply({ content: "⚠️ Name can’t be empty.", ephemeral: true });

      await channel.setName(newName).catch(() => {});
      return interaction.reply({ content: `🔵 Renamed VC to **${newName}**`, ephemeral: true });
    }

    // LIMIT
    if (customId.startsWith("limit_modal_")) {
      const channelId = customId.split("_")[2];
      const channel = guild.channels.cache.get(channelId);
      const vcData = await VoiceChannel.findOne({ guildId: guild.id, userId: member.id });

      if (!vcData || vcData.channelId !== channelId)
        return interaction.reply({ content: "❌ You don’t own this VC.", ephemeral: true });

      const newLimit = parseInt(interaction.fields.getTextInputValue("new_limit"));
      if (isNaN(newLimit) || newLimit < 0 || newLimit > 99)
        return interaction.reply({ content: "⚠️ Please enter a valid number between 0–99.", ephemeral: true });

      await channel.setUserLimit(newLimit).catch(() => {});
      return interaction.reply({
        content:
          newLimit === 0
            ? "👥 User limit removed."
            : `👥 Set VC user limit to **${newLimit}**.`,
        ephemeral: true,
      });
    }
  });

  console.log("✅ VC.js loaded and listening for VC controls");
};
