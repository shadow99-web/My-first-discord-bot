// events/ready.js
const Giveaway = require("../models/Giveaway");
const { setIntervalAsync } = require("set-interval-async/fixed"); // optional (npm i set-interval-async) but regular setInterval is fine
const { EmbedBuilder } = require("discord.js");
const giveawayCommand = require("../commands/giveaway"); // to reuse endGiveaway helper

module.exports = (client) => {
  console.log(`Ready — ${client.user.tag}`);

  // Simple interval (every 15s)
  const checkIntervalMs = 15_000;
  setInterval(async () => {
    try {
      const now = new Date();
      const exp = await Giveaway.find({ ended: false, endAt: { $lte: now } });
      for (const gw of exp) {
        // call endGiveaway helper inside commands/giveaway
        try {
          // commands/giveaway exports endGiveaway function via closure; if not accessible adapt:
          if (typeof giveawayCommand.endGiveaway === "function") {
            await giveawayCommand.endGiveaway(gw);
          } else {
            // fallback: replicate small part of ending logic here
            gw.ended = true;
            const winners = (gw.participants && gw.participants.length) ? gw.participants.sort(() => 0.5 - Math.random()).slice(0, gw.winnersCount) : [];
            gw.winners = winners;
            await gw.save();

            const ch = await client.channels.fetch(gw.channelId).catch(() => null);
            if (ch) {
              await ch.send({
                content: winners.length
                  ? `😄 Giveaway ended! Winners: ${winners.map((id) => `<@${id}>`).join(", ")} — Prize: **${gw.prize}**`
                  : `😞 Giveaway ended for **${gw.prize}**, but there were no participants.`,
              }).catch(() => {});
            }
          }
        } catch (err) {
          console.error("Error ending giveaway:", err);
        }
      }
    } catch (err) {
      console.error("Giveaway scheduler error:", err);
    }
  }, checkIntervalMs);
};
