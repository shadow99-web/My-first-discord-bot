const { SlashCommandBuilder, ActivityType } = require("discord.js");
const ActivitySettings = require("../models/ActivitySettings.js");

// 👑 Developer IDs — replace with yours
const DEV_IDS = ["1378954077462986772"];

const activityMap = {
  playing: ActivityType.Playing,
  listening: ActivityType.Listening,
  watching: ActivityType.Watching,
  competing: ActivityType.Competing,
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setactivity")
    .setDescription("Set the bot's custom activity (Developer only)")
    .addStringOption(opt =>
      opt
        .setName("type")
        .setDescription("Type of activity")
        .setRequired(true)
        .addChoices(
          { name: "Playing", value: "playing" },
          { name: "Listening", value: "listening" },
          { name: "Watching", value: "watching" },
          { name: "Competing", value: "competing" }
        )
    )
    .addStringOption(opt =>
      opt.setName("text").setDescription("Activity text").setRequired(true)
    ),

  name: "setactivity",
  description: "Set or update the bot's activity (developer only)",
  usage: "!setactivity <type> <text>",

  // -------------------------
  // 💬 Prefix Command
  // -------------------------
  async execute(message, args, client) {
    if (!DEV_IDS.includes(message.author.id))
      return message.reply("🚫 Only the bot developer can use this command!");

    const type = args[0]?.toLowerCase();
    const text = args.slice(1).join(" ");

    if (!type || !text)
      return message.reply(
        "❌ Usage: `!setactivity <playing|listening|watching|competing> <text>`"
      );

    const activityType = activityMap[type];
    if (!activityType)
      return message.reply("❌ Invalid type. Choose: playing, listening, watching, competing.");

    try {
      await client.user.setActivity(text, { type: activityType });
      await ActivitySettings.findOneAndUpdate(
        { botId: client.user.id },
        { type, text },
        { upsert: true }
      );

      message.reply(`✅ Bot activity set to **${type} ${text}**`);
    } catch (err) {
      console.error("❌ Error setting activity:", err);
      message.reply("⚠️ Failed to set activity. Check logs.");
    }
  },

  // -------------------------
  // 🧩 Slash Command
  // -------------------------
  async runSlash(interaction, client) {
    if (!DEV_IDS.includes(interaction.user.id))
      return interaction.reply({
        content: "🚫 Only the bot developer can use this command!",
        ephemeral: true,
      });

    const type = interaction.options.getString("type");
    const text = interaction.options.getString("text");
    const activityType = activityMap[type];

    try {
      await client.user.setActivity(text, { type: activityType });
      await ActivitySettings.findOneAndUpdate(
        { botId: client.user.id },
        { type, text },
        { upsert: true }
      );

      await interaction.reply({
        content: `✅ Bot activity set to **${type} ${text}**`,
        ephemeral: true,
      });
    } catch (err) {
      console.error("❌ Error setting activity:", err);
      await interaction.reply({
        content: "⚠️ Failed to set activity. Check console for errors.",
        ephemeral: true,
      });
    }
  },
};
