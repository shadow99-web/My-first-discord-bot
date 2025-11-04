const MemberStats = require("../models/MemberStats");

module.exports = (client) => {
  client.on("guildMemberRemove", async (member) => {
    try {
      if (!member || !member.guild) return console.warn("⚠️ guildMemberRemove triggered without guild info");

      await MemberStats.updateOne(
        { guildId: member.guild.id, date: new Date().toISOString().split("T")[0] },
        { $inc: { leaves: 1 } },
        { upsert: true }
      );

      console.log(`👋 Member left from ${member.guild.name}`);
    } catch (err) {
      console.error("Error saving leave stats:", err);
    }
  });
};
