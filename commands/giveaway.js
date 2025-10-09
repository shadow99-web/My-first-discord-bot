// commands/giveaway.js
const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const Giveaway = require("../models/Giveaway");
const mongoose = require("mongoose");

// helper: parse durations like "10m" "2h" "1d"
function parseDuration(str) {
  if (!str) return null;
  const match = /^(\d+)(s|m|h|d)$/.exec(str);
  if (!match) return null;
  const n = Number(match[1]);
  const unit = match[2];
  const multipliers = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return n * (multipliers[unit] || 0);
}

function formatDate(d) {
  return new Date(d).toUTCString();
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("giveaway")
    .setDescription("Giveaway management (start / end / reroll)")
    .addSubcommand((s) =>
      s
        .setName("start")
        .setDescription("Start a giveaway")
        .addStringOption((o) =>
          o.setName("duration")
            .setDescription("Duration (e.g. 10m, 2h, 1d)")
            .setRequired(true)
        )
        .addIntegerOption((o) =>
          o.setName("winners")
            .setDescription("Number of winners")
            .setRequired(true)
        )
        .addStringOption((o) =>
          o.setName("prize")
            .setDescription("Prize text")
            .setRequired(true)
        )
    )
    .addSubcommand((s) =>
      s
        .setName("end")
        .setDescription("End a giveaway early")
        .addStringOption((o) =>
          o.setName("id")
            .setDescription("Giveaway id or message id")
            .setRequired(true)
        )
    )
    .addSubcommand((s) =>
      s
        .setName("reroll")
        .setDescription("Reroll winners for ended giveaway")
        .addStringOption((o) =>
          o.setName("id")
            .setDescription("Giveaway id or message id")
            .setRequired(true)
        )
    ),

  async execute(context) {
    const isSlash = !context.isPrefix;
    const guild = isSlash ? context.interaction.guild : context.message.guild;
    const channel = isSlash ? context.interaction.channel : context.message.channel;
    const author = isSlash ? context.interaction.user : context.message.author;
    const sub = isSlash ? context.interaction.options.getSubcommand() : (context.args[0] || "").toLowerCase();

    // ==== START ====
    if (sub === "start") {
      const durationStr = isSlash ? context.interaction.options.getString("duration") : context.args[1];
      const durMs = parseDuration(durationStr);
      const winnersCount = isSlash ? context.interaction.options.getInteger("winners") : Number(context.args[2]) || 1;
      const prize = isSlash ? context.interaction.options.getString("prize") : context.args.slice(3).join(" ");

      if (!durMs) {
        const msg = "❌ Invalid duration. Use formats like `10m`, `2h`, `1d`.";
        return isSlash ? context.interaction.reply({ content: msg }) : context.message.reply(msg);
      }
      if (!prize) {
        const msg = "❌ Please provide a prize.";
        return isSlash ? context.interaction.reply({ content: msg }) : context.message.reply(msg);
      }

      if (isSlash) await context.interaction.deferReply();

      const endAt = new Date(Date.now() + durMs);

      // save giveaway (without messageId yet)
      const doc = await Giveaway.create({
        guildId: guild.id,
        channelId: channel.id,
        hostId: author.id,
        prize,
        winnersCount: Math.max(1, winnersCount),
        endAt,
      });

      // Build embed + participate button
      const giftEmoji = "<a:GIFT:1425835546890207465>";
      const joinEmojiId = "1404892773295067218"; // HyperTada id
      const embed = new EmbedBuilder()
        .setTitle(`${giftEmoji} Giveaway: ${prize}`)
        .setDescription(
          `Hosted by <@${author.id}>\n` +
          `Ends at: **${formatDate(endAt)}** (UTC)\n` +
          `Winners: **${doc.winnersCount}**\n\n` +
          `Click the button below to participate!`
        )
        .setColor(0xFAA61A)
        .setFooter({ text: `Giveaway ID: ${doc._id}` })
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`giveaway_enter:${doc._id.toString()}`)
          .setLabel("Participate")
          .setStyle(ButtonStyle.Primary)
          .setEmoji({ id: joinEmojiId })
      );

      const sent = isSlash
        ? await context.interaction.editReply({ embeds: [embed], components: [row], fetchReply: true })
        : await context.message.reply({ embeds: [embed], components: [row] });

      // Save the messageId
      doc.messageId = sent.id;
      await doc.save();

      return;
    }

    // ==== END ====
    if (sub === "end") {
      const id = isSlash ? context.interaction.options.getString("id") : context.args[1];
      if (isSlash) await context.interaction.deferReply();

      const doc = await Giveaway.findOne({
        guildId: guild.id,
        $or: [{ _id: id }, { messageId: id }],
      });

      if (!doc) {
        const msg = "❌ Giveaway not found (check id or messageId).";
        return isSlash ? context.interaction.editReply({ content: msg }) : context.message.reply(msg);
      }
      if (doc.ended) {
        const msg = "🤞🏻 Giveaway already ended.";
        return isSlash ? context.interaction.editReply({ content: msg }) : context.message.reply(msg);
      }

      // only host or manage messages can end
      const member = await guild.members.fetch(author.id).catch(() => null);
      if (doc.hostId !== author.id && (!member || !member.permissions.has("ManageMessages"))) {
        const msg = "❌ Only the host or a moderator can end this giveaway.";
        return isSlash ? context.interaction.editReply({ content: msg }) : context.message.reply(msg);
      }

      // call same end function (defined below)
      await endGiveaway(doc);

      const doneMsg = `✅ Giveaway ended and winners selected (Giveaway ID: ${doc._id})`;
      return isSlash ? context.interaction.editReply({ content: doneMsg }) : context.message.reply(doneMsg);
    }

    // ==== REROLL ====
    if (sub === "reroll") {
      const id = isSlash ? context.interaction.options.getString("id") : context.args[1];
      if (isSlash) await context.interaction.deferReply();

      const doc = await Giveaway.findOne({
        guildId: guild.id,
        $or: [{ _id: id }, { messageId: id }],
      });

      if (!doc) {
        const msg = "❌ Giveaway not found.";
        return isSlash ? context.interaction.editReply({ content: msg }) : context.message.reply(msg);
      }
      if (!doc.ended) {
        const msg = "❌ Giveaway is still running. Wait until it ends before rerolling.";
        return isSlash ? context.interaction.editReply({ content: msg }) : context.message.reply(msg);
      }

      // pick new winners
      const winners = pickWinners(doc.participants, doc.winnersCount);
      doc.winners = winners;
      await doc.save();

      // announce reroll
      const ch = await context.client.channels.fetch(doc.channelId).catch(() => null);
      if (ch) {
        const ann = await ch.send({
          content: winners.length
            ? `🙌 Reroll winners for **${doc.prize}**: ${winners.map((id) => `<@${id}>`).join(", ")}`
            : `🤞🏻 No participants to reroll for **${doc.prize}**.`,
        });
      }

      const doneMsg = `✅ Reroll complete. Winners: ${winners.length ? winners.map((id) => `<@${id}>`).join(", ") : "None"}`;
      return isSlash ? context.interaction.editReply({ content: doneMsg }) : context.message.reply(doneMsg);
    }

    // Default fallback
    const fallback = "❌ Unknown subcommand. Use start / end / reroll.";
    return isSlash ? context.interaction.reply({ content: fallback }) : context.message.reply(fallback);
  },
};

// helper: pick winners randomly (unique). returns array of userIds
function pickWinners(participants, count) {
  const unique = Array.from(new Set(participants || []));
  if (!unique.length) return [];
  // shuffle
  for (let i = unique.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [unique[i], unique[j]] = [unique[j], unique[i]];
  }
  return unique.slice(0, Math.min(count, unique.length));
}

// End giveaway helper: picks winners, edits embed, marks ended
async function endGiveaway(doc) {
  if (!doc) return;
  if (doc.ended) return;

  const winners = pickWinners(doc.participants, doc.winnersCount);
  doc.winners = winners;
  doc.ended = true;
  await doc.save();

  // edit original message embed (if possible)
  try {
    const client = require("../index").client || global.client; // adapt to how you export client
    const ch = await client.channels.fetch(doc.channelId);
    const msg = await ch.messages.fetch(doc.messageId);

    const giftEmoji = "<a:GIFT:1425835546890207465>";
    const embed = new EmbedBuilder()
      .setTitle(`${giftEmoji} Giveaway Ended: ${doc.prize}`)
      .setDescription(
        `Hosted by <@${doc.hostId}>\n` +
        `Winners: ${winners.length ? winners.map((id) => `<@${id}>`).join(", ") : "No winners (no participants)"}\n\n` +
        `Giveaway ended at: **${formatDate(doc.endAt)}** (UTC)`
      )
      .setColor(0x2ECC71)
      .setFooter({ text: `Giveaway ID: ${doc._id}` })
      .setTimestamp();

    await msg.edit({ embeds: [embed], components: [] });
  } catch (err) {
    console.warn("Could not edit giveaway message:", err?.message || err);
  }

  // announce winners in channel
  try {
    const client = require("../index").client || global.client;
    const ch = await client.channels.fetch(doc.channelId);
    await ch.send({
      content: winners.length
        ? `🎉 Congratulations ${winners.map((id) => `<@${id}>`).join(", ")}! You won **${doc.prize}**!`
        : `⚠️ Giveaway ended for **${doc.prize}**, but there were no participants.`,
    });
  } catch (err) {
    console.warn("Could not announce winners:", err?.message || err);
  }
                         }
