const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const VCStats = require("../models/vcStatsSchema.js");

module.exports = {
  name: "vcstats",
  description: "View your VC time or see top users",
  data: new SlashCommandBuilder()
    .setName("vcstats")
    .setDescription("Voice channel activity stats")
    .addSubcommand(cmd =>
      cmd.setName("me").setDescription("Check your VC time")
    )
    .addSubcommand(cmd =>
      cmd.setName("top").setDescription("View top VC users")
    ),

  async execute(context) {
    const isPrefix = !!context.message;
    const user = isPrefix ? context.message.author : context.interaction.user;
    const guild = isPrefix
      ? context.message.guild
      : context.interaction.guild;
    const args = isPrefix ? context.args : [];
    const sub = isPrefix ? (args[0] || "me") : context.interaction.options.getSubcommand();

    if (!guild) return;

    if (sub === "me") {
      const data = await VCStats.findOne({ userId: user.id, guildId: guild.id });
      const total = data?.totalTime || 0;
      const hours = (total / 3600000).toFixed(2);

      const embed = new EmbedBuilder()
        .setTitle("🎧 Your VC Stats")
        .setDescription(`You’ve spent **${hours} hours** in voice channels!`)
        .setColor("Aqua")
        .setThumbnail(user.displayAvatarURL());

      return isPrefix
        ? context.message.reply({ embeds: [embed] })
        : context.interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (sub === "top") {
      const topUsers = await VCStats.find({ guildId: guild.id })
        .sort({ totalTime: -1 })
        .limit(10);

      if (!topUsers.length)
        return isPrefix
          ? context.message.reply("⚠️ No voice activity found yet!")
          : context.interaction.reply("⚠️ No voice activity found yet!");

      const desc = topUsers
        .map((u, i) => {
          const member = guild.members.cache.get(u.userId);
          const name = member ? member.user.username : "Unknown User";
          const hrs = (u.totalTime / 3600000).toFixed(2);
          return `**${i + 1}.** ${name} — 🕒 ${hrs} hrs`;
        })
        .join("\n");

      const embed = new EmbedBuilder()
        .setTitle("🏆 VC Leaderboard")
        .setDescription(desc)
        .setColor("Gold");

      return isPrefix
        ? context.message.reply({ embeds: [embed] })
        : context.interaction.reply({ embeds: [embed] });
    }
  },
};
