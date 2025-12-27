const Parser = require("rss-parser");
const parser = new Parser();
const FacebookFeed = require("../models/FacebookFeed");
const { EmbedBuilder } = require("discord.js");

async function startPoller(client) {
  console.log("📡 Facebook RSS Poller started");

  setInterval(async () => {
    const feeds = await FacebookFeed.find();
    if (!feeds.length) return;

    for (const feed of feeds) {
      try {
        const data = await parser.parseURL(feed.rssUrl);
        if (!data.items.length) continue;

        const latest = data.items[0];

        // Skip if already posted
        if (feed.lastPostLink === latest.link) continue;

        const channel = await client.channels.fetch(feed.channelId).catch(() => null);
        if (!channel) continue;

        // Extract image from HTML
        let image = null;
        const match = latest.content?.match(/<img[^>]+src="([^">]+)"/);
        if (match) image = match[1];

        const embed = new EmbedBuilder()
          .setColor("#1877F2")
          .setTitle("📘 Facebook Post")
          .setURL(latest.link)
          .setDescription(
            latest.contentSnippet?.slice(0, 4000) || "New post"
          )
          .setTimestamp(new Date(latest.pubDate));

        if (image) embed.setImage(image);

        await channel.send({ embeds: [embed] });

        feed.lastPostLink = latest.link;
        await feed.save();

      } catch (err) {
        console.error("❌ FB RSS Error:", err.message);
      }
    }
  }, 10 * 60 * 1000); // 10 minutes
}

module.exports = { startPoller };
