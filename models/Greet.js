// models/Greet.js
const mongoose = require("mongoose");

const greetSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  greet: {
    text: { type: String, default: "" },
    attachment: { type: String, default: null },
    author: { type: String, default: null },
  },
  channel: { type: String, default: null }
});

module.exports = mongoose.model("Greet", greetSchema);
