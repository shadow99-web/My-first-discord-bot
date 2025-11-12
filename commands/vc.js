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
  name: "vc",
  data: new SlashCommandBuilder()
    .setName("vc")
    .setDescription("🎧 Manage your personal voice channel")
    .addSubcommand(sub =>
      sub
        .setName("create")
        .setDescription("Create your own voice channel")
        .addStringOption(opt =>
          opt.setName("name").setDescription("VC name").setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub.setName("delete").setDescription("Delete your personal VC")
    ),

  // ✅ Slash + Prefix unified
  async execute(interaction, args) {
    try {
      const isMessage = !!interaction.content; // true if prefix command
      const sub = isMessage ? args?.[0] : interaction.options?.getSubcommand?.();
      const nameArg = isMessage ? args?.slice(1).join(" ") : interaction.options?.getString?.("name");

      const member = isMessage ? interaction.member : interaction.member;
      const guild = isMessage ? interaction.guild : interaction.guild;
      const replyTarget = interaction;

      if (!sub) {
        const msg = "❌ Use `/vc create` or `/vc delete` (or `!vc create` / `!vc delete`).";
        return replyTarget.reply?.(msg);
      }

      if (sub === "create")
        return await this.createVC(member, guild, replyTarget, nameArg);
      if (sub === "delete")
        return await this.deleteVC(member, guild, replyTarget);

      return replyTarget.reply?.("❌ Unknown subcommand.");
    } catch (err) {
      console.error("❌ Error in /vc:", err);
      if (interaction.reply) {
        await interaction.reply({
          content: "⚠️ Something went wrong while executing this command.",
          flags: 64,
        }).catch(() => {});
      }
    }
  },

  // ==========================
  // CREATE VC FUNCTION
  // ==========================
  async createVC(member, guild, replyTarget, nameArg) {
    const name = nameArg || `${member.user.username}'s VC`;
    const existing = await VoiceChannel.findOne({ guildId: guild.id, userId: member.id });

    if (existing) {
      const msg = "🎧 You already own a VC!";
      return replyTarget.reply?.(msg);
    }

    const channel = await guild.channels.create({
      name,
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

    if (member.voice.channel)
      await member.voice.setChannel(channel).catch(() => {});

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("lock_vc")
        .setLabel("🔒 Lock")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("unlock_vc")
        .setLabel("🔓 Unlock")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("rename_vc")
        .setLabel("🔵 Rename")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("limit_vc")
        .setLabel("👥 Limit")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("delete_vc")
        .setLabel("✖️ Delete")
        .setStyle(ButtonStyle.Danger)
    );

    const embed = new EmbedBuilder()
      .setTitle(`<a:blue_heart:1414309560231002194> SHADOW Voice Control Panel`)
      .setDescription(`🎧 **Channel Created:** ${channel}`)
      .setColor("Blurple")
      .setFooter({
        text: `Owned by ${member.user.tag}`,
        iconURL: member.user.displayAvatarURL(),
      });

    return replyTarget.reply?.({ embeds: [embed], components: [row] });
  },

  // ==========================
  // DELETE VC FUNCTION
  // ==========================
  async deleteVC(member, guild, replyTarget) {
    const vc = await VoiceChannel.findOne({ guildId: guild.id, userId: member.id });
    if (!vc) return replyTarget.reply?.("❌ You don’t own any VC.");

    const channel = guild.channels.cache.get(vc.channelId);
    if (channel) await channel.delete().catch(() => {});

    await VoiceChannel.deleteOne({ _id: vc._id });
    return replyTarget.reply?.("✖️ Your voice channel has been deleted.");
  },
};
