const { SlashCommandBuilder, ActivityType } = require("discord.js");
const ActivitySettings = require("../models/ActivitySettings.js");

// 👑 Developer IDs
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
    .setDescription("👑 Set the bot's custom activity (Developer only)")
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

  /**
   * ✅ Unified Execute Function
   * Handles both Prefix and Slash Command calls.
   */
  async execute({ client, message, interaction, args, safeReply }) {
    try {
      // Identify who is using the command
      const user = message ? message.author : interaction?.user;
      if (!user || !DEV_IDS.includes(user.id)) {
        const reply = { content: "🚫 Only the bot developer can use this command!" };
        return message
          ? message.reply(reply.content)
          : safeReply({ ...reply, flags: 64 });
      }

      // Extract type/text
      let type, text;

      if (message) {
        // Prefix
        type = args[0]?.toLowerCase();
        text = args.slice(1).join(" ");
      } else if (interaction) {
        // Slash
        type = interaction.options.getString("type");
        text = interaction.options.getString("text");
      }

      if (!type || !text) {
        const usageMsg = "❌ Usage: `/setactivity <playing|listening|watching|competing> <text>`";
        return message
          ? message.reply(usageMsg)
          : safeReply({ content: usageMsg, flags: 64 });
      }

      const activityType = activityMap[type];
      if (!activityType) {
        const invalidMsg = "❌ Invalid type. Choose: playing, listening, watching, or competing.";
        return message
          ? message.reply(invalidMsg)
          : safeReply({ content: invalidMsg, flags: 64 });
      }

      // ✅ Set the activity live
      await client.user.setActivity(text, { type: activityType });

      // 💾 Save to MongoDB
      await ActivitySettings.findOneAndUpdate(
        { botId: client.user.id },
        { type, text },
        { upsert: true }
      );

      const successMsg = `✅ Bot activity set to **${type} ${text}**`;
      return message
        ? message.reply(successMsg)
        : safeReply({ content: successMsg, flags: 64 });
    } catch (err) {
      console.error("❌ Error setting activity:", err);
      const errorMsg = "⚠️ Failed to set activity. Check console for details.";
      return message
        ? message.reply(errorMsg)
        : safeReply({ content: errorMsg, flags: 64 });
    }
  },
};
