// commands/vc.js
const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  PermissionFlagsBits,
  ChannelType,
} = require("discord.js");
const VoiceChannel = require("../models/vcSchema");

module.exports = {
  // Slash metadata so your deploy picks it up
  data: new SlashCommandBuilder()
    .setName("vc")
    .setDescription("🎧 Manage your personal voice channel")
    .addSubcommand((sub) =>
      sub
        .setName("create")
        .setDescription("Create your own voice channel")
        .addStringOption((opt) => opt.setName("name").setDescription("VC name").setRequired(false))
    )
    .addSubcommand((sub) => sub.setName("delete").setDescription("Delete your personal VC")),

  name: "vc",
  description: "🎧 Manage your personal voice channel (prefix + slash)",

  /**
   * context object from your event loader:
   * { client, interaction, message, safeReply, args, isPrefix }
   */
  async execute(context) {
    const { interaction, message, safeReply, args, isPrefix } = context;
    const isMsg = !!isPrefix;

    // helper to reply using safeReply (slash) or message.reply (prefix)
    const reply = async (payload) => {
      try {
        if (typeof safeReply === "function") return await safeReply(payload);
        if (isMsg && message?.reply) {
          // if payload is an object { embeds... } or string
          if (typeof payload === "string") return await message.reply(payload);
          return await message.reply(payload);
        }
        // fallback: interaction
        if (interaction?.reply) {
          return await interaction.reply(payload).catch(() => {});
        }
      } catch (e) {
        console.error("Reply failed:", e);
      }
    };

    try {
      // resolve subcommand + name argument from both modes
      const sub = isMsg ? (args?.[0] || "").toLowerCase() : interaction?.options?.getSubcommand?.();
      const nameArg = isMsg ? args?.slice(1).join(" ").trim() : interaction?.options?.getString?.("name");

      if (!sub) {
        return reply(
          "❌ Usage: `/vc create [name]` | `/vc delete`  — or prefix: `!vc create [name]` / `!vc delete`"
        );
      }

      if (sub === "create") return await this.createVC({ context, nameArg, reply });
      if (sub === "delete") return await this.deleteVC({ context, reply });

      return reply("❌ Unknown subcommand. Use `create` or `delete`.");
    } catch (err) {
      console.error("❌ Error in vc.execute:", err);
      await reply({ content: "⚠️ Something went wrong while executing VC command." });
    }
  },

  // payload: { context, nameArg, reply }
  async createVC({ context, nameArg, reply }) {
    const { interaction, message, isPrefix } = context;
    const member = isPrefix ? message.member : interaction.member;
    const guild = isPrefix ? message.guild : interaction.guild;
    const displayName = nameArg || `${member.user.username}'s VC`;

    try {
      const existing = await VoiceChannel.findOne({ guildId: guild.id, userId: member.id });
      if (existing && guild.channels.cache.get(existing.channelId)) {
        return reply("🎧 You already own a VC!");
      }

      const channel = await guild.channels.create({
        name: displayName,
        type: ChannelType.GuildVoice,
        permissionOverwrites: [
          { id: guild.id, deny: [PermissionFlagsBits.Connect] },
          {
            id: member.id,
            allow: [
              PermissionFlagsBits.Connect,
              PermissionFlagsBits.Speak,
              PermissionFlagsBits.Stream,
              PermissionFlagsBits.ManageChannels,
              PermissionFlagsBits.MuteMembers,
              PermissionFlagsBits.MoveMembers,
            ],
          },
        ],
      });

      await VoiceChannel.create({
        guildId: guild.id,
        userId: member.id,
        channelId: channel.id,
      });

      // move user if in voice
      if (member.voice?.channel) {
        await member.voice.setChannel(channel).catch(() => {});
      }

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`vc_lock_${channel.id}`).setLabel("🔒 Lock").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`vc_unlock_${channel.id}`).setLabel("🔓 Unlock").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`vc_rename_${channel.id}`).setLabel("🔵 Rename").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`vc_limit_${channel.id}`).setLabel("👥 Limit").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`vc_delete_${channel.id}`).setLabel("✖️ Delete").setStyle(ButtonStyle.Danger)
      );

      const embed = new EmbedBuilder()
        .setTitle(`<a:blue_heart:1414309560231002194> SHADOW Voice Control Panel`)
        .setDescription(`🎧 **Channel Created:** ${channel}`)
        .setColor("Blurple")
        .setFooter({ text: `Owned by ${member.user.tag}`, iconURL: member.user.displayAvatarURL() });

      return reply({ embeds: [embed], components: [row] });
    } catch (err) {
      console.error("❌ createVC error:", err);
      return reply("⚠️ Failed to create VC. Check permissions & bot intents.");
    }
  },

  // payload: { context, reply }
  async deleteVC({ context, reply }) {
    const { interaction, message, isPrefix } = context;
    const member = isPrefix ? message.member : interaction.member;
    const guild = isPrefix ? message.guild : interaction.guild;

    try {
      const vc = await VoiceChannel.findOne({ guildId: guild.id, userId: member.id });
      if (!vc) return reply("❌ You don’t own any VC.");

      const channel = guild.channels.cache.get(vc.channelId);
      if (channel) await channel.delete().catch(() => {});
      await VoiceChannel.deleteOne({ _id: vc._id }).catch(() => {});

      return reply("✖️ Your voice channel has been deleted.");
    } catch (err) {
      console.error("❌ deleteVC error:", err);
      return reply("⚠️ Failed to delete VC.");
    }
  },
};
