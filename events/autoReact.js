const AutoReact = require("../models/AutoReact");

// helper: extract emoji id if custom (<:name:id> or <a:name:id>)
function parseEmojiInput(raw) {
  if (!raw) return { type: "unicode", value: raw };

  // custom emoji patterns
  const match = raw.match(/<(a)?:([a-zA-Z0-9_]+):(\d+)>/);
  if (match) {
    const id = match[3];
    return { type: "custom", value: id }; // we'll pass id to message.react
  }

  // if user provided something like name:id (rare), try id part
  const alt = raw.match(/^([a-zA-Z0-9_]+):(\d+)$/);
  if (alt) {
    return { type: "custom", value: alt[2] };
  }

  // plain unicode emoji string
  return { type: "unicode", value: raw };
}

module.exports = (client) => {
  client.on("messageCreate", async (message) => {
    try {
      if (!message.guild || message.author.bot) return;

      const doc = await AutoReact.findOne({ guildId: message.guild.id });
      if (!doc || !doc.triggers || doc.triggers.length === 0) return;

      const lower = message.content.toLowerCase();

      // gather unique emojis to react (avoid duplicates)
      const reacted = new Set();

      for (const t of doc.triggers) {
        try {
          if (!t.word) continue;
          // contains check (case-insensitive)
          if (!lower.includes(t.word.toLowerCase())) continue;

          const parsed = parseEmojiInput(t.emoji);

          // avoid trying same emoji twice in the loop
          if (reacted.has(t.emoji)) continue;

          // message.react accepts unicode or emoji id (for custom)
          if (parsed.type === "custom") {
            // check if guild has this emoji cached; else try react with id
            const emoji = client.emojis.cache.get(parsed.value);
            if (emoji) {
              await message.react(emoji.id).catch(() => {});
            } else {
              // try react with id string (works if bot is in emoji guild)
              await message.react(parsed.value).catch(() => {});
            }
          } else {
            // unicode
            await message.react(parsed.value).catch(() => {});
          }

          reacted.add(t.emoji);
        } catch (innerErr) {
          // ignore per-trigger errors (invalid emoji etc.)
          // console.warn("AutoReact trigger failed:", innerErr);
        }
      }
    } catch (err) {
      console.error("❌ AutoReact event error:", err);
    }
  });
};
