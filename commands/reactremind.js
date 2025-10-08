const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("reactremind")
    .setDescription("DM reminders to users until they react to a target message (opt-in only)")
    .addStringOption(opt =>
      opt.setName("message_id")
        .setDescription("Target message ID users should react to")
        .setRequired(true)
    )
    .addIntegerOption(opt =>
      opt.setName("interval_minutes")
        .setDescription("Minutes between reminder rounds (default 10)")
        .setRequired(false)
    )
    .addIntegerOption(opt =>
      opt.setName("max_retries")
        .setDescription("Maximum number of DM reminders per user (default 3)")
        .setRequired(false)
    ),

  async execute(context) {
    const isSlash = !context.isPrefix;
    const channel = isSlash ? context.interaction.channel : context.message.channel;
    const author = isSlash ? context.interaction.user : context.message.author;
    const guild = isSlash ? context.interaction.guild : context.message.guild;

    const messageId = isSlash ? context.interaction.options.getString("message_id") : context.args[0];
    const intervalMinutes = isSlash ? (context.interaction.options.getInteger("interval_minutes") ?? 10) : parseInt(context.args[1]) || 10;
    const maxRetries = isSlash ? (context.interaction.options.getInteger("max_retries") ?? 3) : parseInt(context.args[2]) || 3;

    if (!messageId) return (isSlash ? context.interaction.reply({ content: "❌ Please provide the target message ID.", ephemeral: true }) : context.message.reply("❌ Please provide the target message ID."));

    // Fetch target message
    let targetMsg;
    try {
      targetMsg = await channel.messages.fetch(messageId);
    } catch {
      return (isSlash ? context.interaction.reply({ content: "❌ Could not fetch the target message. Make sure the ID is correct.", ephemeral: true }) : context.message.reply("❌ Could not fetch the target message. Make sure the ID is correct."));
    }

    // Announce the reminder
    const announceEmbed = new EmbedBuilder()
      .setTitle("🔔 ReactRemind Announcement")
      .setDescription(`React with ✅ to the **target message** (ID: ${messageId}) to opt in for DM reminders.\nRemove your reaction to stop reminders.`)
      .setFooter({ text: `Invoked by ${author.tag}` })
      .setColor(0x5865f2)
      .setTimestamp();

    const sentAnnounce = isSlash
      ? await context.interaction.reply({ embeds: [announceEmbed], fetchReply: true })
      : await context.message.reply({ embeds: [announceEmbed], fetchReply: true });

    try { await sentAnnounce.react("✅"); } catch {}

    // Track opted-in users and DM counts
    const optedSet = new Set();
    const reminderCounts = new Map();

    const collector = sentAnnounce.createReactionCollector({ filter: (reaction, user) => reaction.emoji.name === "✅" && !user.bot, time: intervalMinutes * 60 * 1000 * (maxRetries + 1) });
    collector.on("collect", (reaction, user) => optedSet.add(user.id));
    collector.on("remove", (reaction, user) => optedSet.delete(user.id));

    // Scoreboard message
    const scoreboardMsg = await channel.send({ embeds: [new EmbedBuilder().setTitle("📊 ReactRemind Scoreboard").setDescription("Tracking...").setColor(0x1f8b4c)] });

    const updateScoreboard = async () => {
      const reactedUsers = [];
      const pendingUsers = [];
      for (const userId of optedSet) {
        const memberReacted = await targetMsg.reactions.cache.get("✅")?.users.fetch().then(u => u.has(userId)).catch(() => false);
        const count = reminderCounts.get(userId) ?? 0;
        if (memberReacted) reactedUsers.push(`<@${userId}> ✅ (DMs: ${count})`);
        else pendingUsers.push(`<@${userId}> ⏳ (DMs: ${count})`);
      }

      const embed = new EmbedBuilder()
        .setTitle("📊 ReactRemind Scoreboard")
        .addFields(
          { name: "✅ Reacted", value: reactedUsers.join("\n") || "None" },
          { name: "⏳ Pending", value: pendingUsers.join("\n") || "None" }
        )
        .setColor(0x1f8b4c)
        .setTimestamp();

      scoreboardMsg.edit({ embeds: [embed] }).catch(() => {});
    };

    // Reminder loop
    let round = 0;
    const intervalMs = Math.max(5, intervalMinutes) * 60 * 1000;
    const perDmDelayMs = 1500;

    const reminderInterval = setInterval(async () => {
      round++;
      const currentOpted = Array.from(optedSet);
      for (const userId of currentOpted) {
        const sentCount = reminderCounts.get(userId) ?? 0;
        if (sentCount >= maxRetries) continue;

        const memberReacted = await targetMsg.reactions.cache.get("✅")?.users.fetch().then(u => u.has(userId)).catch(() => false);
        if (memberReacted) {
          optedSet.delete(userId);
          continue;
        }

        try {
          const userObj = await context.client.users.fetch(userId);
          await userObj.send(`🔔 Reminder: Please react ✅ to the target message:\n${targetMsg.url}\n(Max ${maxRetries} reminders)`).catch(() => optedSet.delete(userId));
          reminderCounts.set(userId, sentCount + 1);
          await new Promise(res => setTimeout(res, perDmDelayMs));
        } catch {}
      }

      await updateScoreboard();

      if (round >= maxRetries) {
        clearInterval(reminderInterval);
        collector.stop();
      }
    }, intervalMs);

    collector.on("end", () => clearInterval(reminderInterval));
  },
};
