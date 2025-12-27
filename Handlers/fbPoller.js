const FBFeed = require("../models/FacebookFeed");
const axios = require("axios");
const { EmbedBuilder } = require("discord.js");

const FB_ACCESS_TOKEN = process.env.FB_ACCESS_TOKEN; // Page or App Token

async function fetchLatestPost(pageId) {
  try {
    const res = await axios.get(`https://graph.facebook.com/v17.0/${pageId}/posts`, {
      params: {
        access_token: FB_ACCESS_TOKEN,
        fields: "id,message,created_time,full_picture,type",
        limit: 1
      }
    });

    const posts = res.data.data;
    if (!posts || !posts.length) return null;

    const post = posts[0];

    // Only allow text + images
    if (post.type !== "photo" && !post.message) return null;

    return post;
  } catch (err) {
    console.error("❌ FB API Error:", err.response?.data || err.message);
    return null;
  }
}

async function pollFeeds(client) {
  const feeds = await FBFeed.find({});
  for (const feed of feeds) {
    const channel = client.channels.cache.get(feed.channelId);
    if (!channel) continue;

    const post = await fetchLatestPost(feed.pageId);
    if (!post) continue;

    if (feed.lastPostId === post.id) continue; // already posted

    // Create embed for text + images
    const embed = new EmbedBuilder()
      .setTitle(`New post from ${feed.pageId}`)
      .setURL(`https://facebook.com/${post.id}`)
      .setColor("Blue")
      .setTimestamp(new Date(post.created_time));

    if (post.message) embed.setDescription(post.message);
    if (post.full_picture) embed.setImage(post.full_picture);

    await channel.send({ embeds: [embed] }).catch(() => {});

    // Save last posted ID
    feed.lastPostId = post.id;
    await feed.save();
  }
}

// Poll every minute
function startPoller(client, interval = 60_000) {
  setInterval(() => pollFeeds(client), interval);
}

module.exports = { startPoller };
