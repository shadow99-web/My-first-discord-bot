const VCStats = require("../models/vcStatsSchema.js");

module.exports = async (oldState, newState) => {

  const user = newState?.member?.user || oldState?.member?.user;
  const guild = newState?.guild || oldState?.guild;

  if (!user || user.bot) return;

  try {
    let data = await VCStats.findOne({ userId: user.id, guildId: guild.id });
    if (!data) {
      data = await VCStats.create({ userId: user.id, guildId: guild.id });
    }

    // User JOINED VC
    if (!oldState.channelId && newState.channelId) {
      data.lastJoin = Date.now();
      await data.save();
    }

    // User LEFT VC
    else if (oldState.channelId && !newState.channelId) {
      if (data.lastJoin) {
        const duration = Date.now() - data.lastJoin;
        data.totalTime += duration;
        data.lastJoin = null;
        await data.save();
      }
    }
  } catch (err) {
    console.error("VC Tracker Error:", err);
  }
};
