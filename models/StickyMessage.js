// models/StickyMessage.js
const mongoose = require("mongoose");

const StickySchema = new mongoose.Schema(
  {
    guildId: {
      type: String,
      required: true,
      index: true,
    },

    channelId: {
      type: String,
      required: true,
      index: true,
    },

    message: {
      type: String,
      required: true,
    },

    authorId: {
      type: String,
      required: true,
    },

    // 👇 Sticky repost system
    lastMessageId: {
      type: String,
      default: null,
    },

    lastAuthorId: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true, // optional but recommended
  }
);

module.exports = mongoose.model("StickyMessage", StickySchema);
