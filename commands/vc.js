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

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    if (sub === "create") return this.createVC(interaction.member, interaction.guild, interaction);
    if (sub === "delete") return this.deleteVC(interaction.member, interaction.guild, interaction);
  },

  async executePrefix(message, args) {
    const sub = args[0];
    if (!sub) return message.reply("🔴 Use: `!vc create` or `!vc delete`");

    if (sub === "create") return this.createVC(message.member, message.guild, message);
    if (sub === "delete") return this.deleteVC(message.member, message.guild, message);

    return message.reply("🔴 Unknown subcommand.");
  },

  async createVC(member, guild, replyTarget, nameArg) {
    const name = nameArg || `${member.user.username}'s VC`;
    const existing = await VoiceChannel.findOne({ guildId: guild.id, userId: member.id });

    if (existing) {
      const msg = "🎧 You already own a VC!";
      return replyTarget.reply ? replyTarget.reply(msg) : replyTarget.followUp(msg);
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

    if (member.voice.channel) await member.voice.setChannel(channel).catch(() => {});

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("lock_vc").setLabel("🔒 Lock").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("unlock_vc").setLabel("🔓 Unlock").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("rename_vc").setLabel("🔵 Rename").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("limit_vc").setLabel("👥 Limit").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("delete_vc").setLabel("✖️ Delete").setStyle(ButtonStyle.Danger)
    );

    const embed = new EmbedBuilder()
      .setTitle(`<a:blue_heart:1414309560231002194> SHADOW Voice Control Panel`)
      .setDescription(`🎧 **Channel Created:** ${channel}`)
      .setColor("Blurple")
      .setFooter({
        text: `Owned by ${member.user.tag}`,
        iconURL: member.user.displayAvatarURL(),
      });

    const replyObj = { embeds: [embed], components: [row] };

    return replyTarget.reply
      ? replyTarget.reply(replyObj)
      : replyTarget.followUp({ ...replyObj, flags: 64 });
  },

  async deleteVC(member, guild, replyTarget) {
    const vc = await VoiceChannel.findOne({ guildId: guild.id, userId: member.id });
    if (!vc) {
      const msg = "❌ You don’t own any VC.";
      return replyTarget.reply ? replyTarget.reply(msg) : replyTarget.followUp(msg);
    }

    const channel = guild.channels.cache.get(vc.channelId);
    if (channel) await channel.delete().catch(() => {});

    await VoiceChannel.deleteOne({ _id: vc._id });

    const msg = `✖️ Your voice channel has been deleted.`;
    return replyTarget.reply ? replyTarget.reply(msg) : replyTarget.followUp(msg);
  },
};
