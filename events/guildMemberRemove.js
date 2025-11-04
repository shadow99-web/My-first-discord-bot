const MemberStats = require("../models/MemberStats");

module.exports = async (member) => {
  try {
    await MemberStats.updateOne(
      { guildId: member.guild.id, date: new Date().toISOString().split("T")[0] },
      { $inc: { leaves: 1 } },
      { upsert: true }
    );
  } catch (err) {
    console.error("Error saving leave stats:", err);
  }
};
